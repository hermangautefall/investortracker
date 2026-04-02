from datetime import date

import yfinance as yf
import finnhub

import os
from core.db import get_client
from core.logger import log, log_warning, log_error
from core.rate_limiter import YFINANCE_LIMITER, FINNHUB_LIMITER

BATCH_SIZE = 100


def _fetch_price_yfinance(ticker: str, trade_date: date) -> float | None:
    """Fetch closing price for a ticker on a specific date using yfinance."""
    YFINANCE_LIMITER.wait()
    try:
        start = trade_date.isoformat()
        # Fetch a 5-day window to handle weekends/holidays
        import pandas as pd
        end = (pd.Timestamp(start) + pd.Timedelta(days=5)).strftime("%Y-%m-%d")
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
        if df.empty:
            return None
        close = df["Close"].iloc[0]
        return float(close) if close is not None else None
    except Exception as e:
        log_warning(f"yfinance failed for {ticker} on {trade_date}: {e}")
        return None


def _fetch_price_finnhub(ticker: str, trade_date: date) -> float | None:
    """Fetch closing price for a ticker on a specific date using Finnhub."""
    FINNHUB_LIMITER.wait()
    try:
        api_key = os.getenv("FINNHUB_API_KEY", "")
        client = finnhub.Client(api_key=api_key)
        import time as _time
        ts_from = int(_time.mktime(trade_date.timetuple()))
        ts_to = ts_from + 86400 * 5  # 5-day window
        candles = client.stock_candles(ticker, "D", ts_from, ts_to)
        if candles.get("s") != "ok" or not candles.get("c"):
            return None
        return float(candles["c"][0])
    except Exception as e:
        log_warning(f"Finnhub failed for {ticker} on {trade_date}: {e}")
        return None


def enrich_missing_prices(tickers_dates: set[tuple[str, date]]) -> None:
    """
    Fetch only the (ticker, date) combinations not already in stock_prices.

    Algorithm:
    1. Query stock_prices for all existing (ticker, date) pairs
    2. Compute missing = tickers_dates - cached
    3. Group missing by ticker
    4. For each ticker+date:
       a. Try yfinance (YFINANCE_LIMITER.wait())
       b. On failure: try Finnhub (FINNHUB_LIMITER.wait())
       c. On both failures: log warning and continue – never crash
    5. Batch-insert results to stock_prices (100 rows per call)

    One failing ticker must never stop the others.
    """
    if not tickers_dates:
        log("No ticker/date pairs to enrich")
        return

    client = get_client()

    # Step 1: fetch existing pairs from DB
    existing: set[tuple[str, str]] = set()
    try:
        result = client.table("stock_prices").select("ticker, date").execute()
        for row in result.data or []:
            existing.add((row["ticker"], row["date"]))
    except Exception as e:
        log_warning(f"Could not fetch existing stock_prices: {e}")

    # Step 2: compute missing
    missing = {
        (t, d) for t, d in tickers_dates
        if (t, d.isoformat()) not in existing
    }
    log(f"Prices: {len(tickers_dates)} needed, {len(existing)} cached, {len(missing)} to fetch")

    if not missing:
        return

    # Step 3: group by ticker
    by_ticker: dict[str, list[date]] = {}
    for ticker, d in missing:
        by_ticker.setdefault(ticker, []).append(d)

    # Step 4: fetch prices
    to_insert: list[dict] = []
    for ticker, dates in by_ticker.items():
        for d in dates:
            price = _fetch_price_yfinance(ticker, d)
            source = "yfinance"
            if price is None:
                price = _fetch_price_finnhub(ticker, d)
                source = "finnhub"
            if price is None:
                log_warning(f"Could not fetch price for {ticker} on {d} – skipping")
                continue
            to_insert.append({
                "ticker": ticker,
                "date": d.isoformat(),
                "close_price": price,
                "source": source,
            })

    # Step 5: batch insert
    for i in range(0, len(to_insert), BATCH_SIZE):
        batch = to_insert[i:i + BATCH_SIZE]
        try:
            client.table("stock_prices").upsert(batch, on_conflict="ticker,date").execute()
            log(f"Prices batch {i // BATCH_SIZE + 1}: inserted {len(batch)} rows")
        except Exception as e:
            log_error(f"Prices batch {i // BATCH_SIZE + 1} failed: {e}")
