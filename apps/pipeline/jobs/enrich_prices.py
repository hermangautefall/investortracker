import sys
import time
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from core.db import get_client
from core.logger import log, log_error
from enrichers.prices import enrich_missing_prices
from monitor.alerts import send_alert

JOB_NAME = "enrich_prices"
LOOKBACK_DAYS = 30


def run() -> None:
    """
    Fetch stock prices for all tickers traded in the last LOOKBACK_DAYS days.
    Checks DB cache first and only fetches what is missing.
    """
    start = time.time()
    log(f"Starting – collecting tickers from last {LOOKBACK_DAYS} days", job=JOB_NAME)

    rows_inserted = 0

    try:
        client = get_client()
        cutoff = (datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")

        tickers_dates: set[tuple[str, date]] = set()

        # Collect from congress_trades
        ct_result = (
            client.table("congress_trades")
            .select("ticker, trade_date")
            .gte("trade_date", cutoff)
            .not_.is_("ticker", "null")
            .execute()
        )
        for row in ct_result.data or []:
            tickers_dates.add((row["ticker"], date.fromisoformat(row["trade_date"])))

        # Collect from insider_trades
        it_result = (
            client.table("insider_trades")
            .select("ticker, trade_date")
            .gte("trade_date", cutoff)
            .execute()
        )
        for row in it_result.data or []:
            tickers_dates.add((row["ticker"], date.fromisoformat(row["trade_date"])))

        log(f"Found {len(tickers_dates)} unique (ticker, date) pairs to check", job=JOB_NAME)

        enrich_missing_prices(tickers_dates)

        # Count what was inserted (approximate from stock_prices growth)
        duration = round(time.time() - start, 2)
        client.table("pipeline_runs").insert({
            "job_name": JOB_NAME,
            "status": "success",
            "rows_inserted": rows_inserted,
            "duration_seconds": duration,
        }).execute()
        log(f"Done ({duration}s)", job=JOB_NAME)

    except Exception as e:
        duration = round(time.time() - start, 2)
        get_client().table("pipeline_runs").insert({
            "job_name": JOB_NAME,
            "status": "failed",
            "error_message": str(e),
            "duration_seconds": duration,
        }).execute()
        send_alert(JOB_NAME, str(e))
        log_error(f"CRASHED: {e}", job=JOB_NAME)
        sys.exit(1)


if __name__ == "__main__":
    run()
