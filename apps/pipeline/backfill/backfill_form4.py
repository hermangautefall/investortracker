"""
Historical Form 4 backfill — fetches all insider trades for a given year (or range of years).

Differences from fetch_form4.py (the daily job):
  - Accepts a full year as the date window: "YYYY-01-01:YYYY-12-31"
  - No MAX_FILINGS_PER_RUN cap by default (configurable via --batch-size).
  - Saves progress per year to backfill_state so partial runs can be identified.
  - Dedup is handled by the DB upsert (ignore_duplicates=True) — no pre-check needed.

Usage:
    python backfill/backfill_form4.py --year 2023
    python backfill/backfill_form4.py --from-year 2020   # 2020 → current year
    python backfill/backfill_form4.py --year 2022 --batch-size 500

Prerequisite — run migration 009_backfill_state.sql in Supabase.
"""

import argparse
import math
import os
import sys
import time
from datetime import date, datetime

from dotenv import load_dotenv
load_dotenv()

from edgar import get_filings, set_identity

from core.db import get_client
from core.logger import log, log_error, log_warning
from core.rate_limiter import SEC_LIMITER
from core.validator import InsiderTrade
from loaders.supabase_loader import load_insider_trades

DEFAULT_BATCH_SIZE = 1000  # max filings to process per year per run

_CODE_MAP = {
    "P": "buy",
    "S": "sell",
    "A": "buy",   # Award
    "D": "sell",  # Disposition
    "M": "option_exercise",
    "C": "option_exercise",
    "F": "sell",  # Tax withholding
}


def _map_trade_type(code: str | None) -> str | None:
    if not code:
        return None
    return _CODE_MAP.get(str(code).strip().upper())


def _job_name(year: int) -> str:
    return f"backfill_form4_{year}"


# ---------------------------------------------------------------------------
# Backfill state helpers
# ---------------------------------------------------------------------------

def load_state(client, year: int) -> dict:
    try:
        result = (
            client.table("backfill_state")
            .select("*")
            .eq("job_name", _job_name(year))
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as e:
        log_warning(f"Could not read backfill_state for {year}: {e}", job=_job_name(year))
    return {}


def save_state(client, year: int, total_processed: int, total_inserted: int, completed: bool = False) -> None:
    try:
        client.table("backfill_state").upsert({
            "job_name": _job_name(year),
            "last_cik": None,
            "total_processed": total_processed,
            "total_inserted": total_inserted,
            "completed": completed,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="job_name").execute()
    except Exception as e:
        log_warning(f"Could not save backfill_state for {year}: {e}", job=_job_name(year))


# ---------------------------------------------------------------------------
# Form 4 fetching with date-range support
# ---------------------------------------------------------------------------

def fetch_form4_year(year: int, batch_size: int) -> tuple[list[dict], list[dict]]:
    """
    Fetch Form 4 filings for the full calendar year.
    Returns (trades_list, raw_list) — parallel lists for load_insider_trades.
    """
    job = _job_name(year)
    identity = os.getenv("EDGAR_IDENTITY")
    if not identity:
        raise ValueError("EDGAR_IDENTITY environment variable must be set")
    set_identity(identity)

    date_range = f"{year}-01-01:{year}-12-31"
    log(f"Fetching Form 4 filings for date range {date_range}", job=job)

    try:
        filing_list = get_filings(form="4", filing_date=date_range)
    except Exception as e:
        log_warning(f"Could not get filings list for {year}: {e}", job=job)
        return [], []

    trades: list[dict] = []
    raw_rows: list[dict] = []
    processed = 0
    skipped = 0
    seen_accessions: set = set()

    for filing in filing_list:
        if processed >= batch_size:
            log(
                f"Reached batch limit of {batch_size} filings for {year} – "
                "re-run or increase --batch-size to continue",
                job=job,
            )
            break

        accession_no = filing.accession_no or ""
        if accession_no and accession_no in seen_accessions:
            skipped += 1
            continue
        if accession_no:
            seen_accessions.add(accession_no)

        SEC_LIMITER.wait()
        try:
            form4 = filing.obj()
            if form4 is None:
                skipped += 1
                continue

            df = form4.to_dataframe()
            if df is None or df.empty:
                skipped += 1
                continue

        except Exception as e:
            log_warning(f"Could not parse filing {filing.accession_no}: {e}", job=job)
            skipped += 1
            continue

        cik = str(filing.cik) if filing.cik else ""
        filing_date_str = str(filing.filing_date) if filing.filing_date else None
        form4_url = (
            f"https://www.sec.gov/Archives/edgar/data/{cik}/"
            f"{accession_no.replace('-', '')}/{accession_no}-index.htm"
            if cik and accession_no else None
        )

        for _, row in df.iterrows():
            code = str(row.get("Code") or "")
            trade_type = _map_trade_type(code)
            if not trade_type:
                continue

            shares_raw = row.get("Shares")
            price_raw  = row.get("Price")
            value_raw  = row.get("Value")

            def _clean(v):
                return None if (v is None or (isinstance(v, float) and math.isnan(v))) else v

            shares = _clean(shares_raw)
            price  = _clean(price_raw)
            value  = _clean(value_raw)

            txn_date = row.get("Date")
            ticker   = str(row.get("Ticker") or "").strip().upper()
            insider  = str(row.get("Insider") or "").strip()
            company  = str(row.get("Issuer") or "").strip()

            if not ticker:
                continue

            insider_name = insider.split(" / ")[0].strip() if insider else "Unknown"
            position     = str(row.get("Position") or "").strip() or None

            raw_dict: dict = {}
            for k, v in row.to_dict().items():
                if hasattr(v, "item"):
                    v = v.item()
                if hasattr(v, "isoformat"):
                    raw_dict[k] = v.isoformat()
                elif isinstance(v, float) and (v != v):
                    raw_dict[k] = None
                elif not isinstance(v, (str, int, float, bool, type(None))):
                    raw_dict[k] = str(v)
                else:
                    raw_dict[k] = v

            raw_dict["accession_no"] = accession_no

            trades.append({
                "insider_name":    insider_name,
                "cik":             cik,
                "primary_role":    position,
                "primary_company": company or None,
                "ticker":          ticker,
                "company_name":    company or None,
                "trade_type":      trade_type,
                "shares":          int(shares) if shares is not None else None,
                "price_per_share": float(price) if price is not None else None,
                "total_value":     float(value) if value is not None else None,
                "trade_date":      txn_date.strftime("%Y-%m-%d") if hasattr(txn_date, "strftime") else (str(txn_date)[:10] if txn_date else filing_date_str),
                "filing_date":     filing_date_str,
                "form4_url":       form4_url,
                "source":          "sec_form4",
            })
            raw_rows.append(raw_dict)

        processed += 1
        if processed % 100 == 0:
            log(f"  Progress: {processed} filings processed, {len(trades)} trades so far", job=job)

    log(
        f"Year {year}: {len(trades)} transactions from {processed} filings, {skipped} skipped",
        job=job,
    )
    return trades, raw_rows


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_trade(raw: dict, job: str) -> InsiderTrade | None:
    try:
        return InsiderTrade(
            insider_name=raw["insider_name"],
            cik=raw["cik"],
            primary_role=raw.get("primary_role"),
            primary_company=raw.get("primary_company"),
            ticker=raw["ticker"],
            company_name=raw.get("company_name"),
            trade_type=raw["trade_type"],
            shares=raw.get("shares"),
            price_per_share=raw.get("price_per_share"),
            total_value=raw.get("total_value"),
            trade_date=raw["trade_date"],
            filing_date=raw.get("filing_date") or raw["trade_date"],
            form4_url=raw.get("form4_url"),
        )
    except Exception as e:
        log_warning(
            f"Validation failed for {raw.get('ticker')} / {raw.get('trade_date')}: {e}",
            job=job,
        )
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_year(year: int, batch_size: int, client) -> None:
    job = _job_name(year)
    state = load_state(client, year)

    if state.get("completed"):
        log(f"Year {year} already marked completed — skipping.", job=job)
        return

    log(f"Processing year {year} (batch_size={batch_size})", job=job)
    start = time.time()

    raw_trades, raw_rows = fetch_form4_year(year, batch_size)
    if not raw_trades:
        log(f"No trades returned for {year}", job=job)
        save_state(client, year, 0, 0, completed=True)
        return

    valid_trades: list[InsiderTrade] = []
    valid_raw: list[dict] = []
    for raw, raw_row in zip(raw_trades, raw_rows):
        trade = _validate_trade(raw, job)
        if trade is not None:
            valid_trades.append(trade)
            valid_raw.append(raw_row)

    log(f"Year {year}: {len(valid_trades)} valid trades after validation", job=job)

    inserted = skipped = 0
    if valid_trades:
        inserted, skipped = load_insider_trades(valid_trades, valid_raw, job=job)

    duration = round(time.time() - start, 2)
    log(
        f"Year {year}: inserted {inserted}, skipped {skipped} ({duration}s)",
        job=job,
    )

    # Mark completed only if we processed fewer than batch_size filings
    # (meaning we got through the whole year without hitting the cap)
    completed = len(raw_trades) < batch_size
    save_state(client, year, len(raw_trades), inserted, completed=completed)
    if not completed:
        log(
            f"Year {year}: batch limit reached — re-run to continue (some filings may be missing)",
            job=job,
        )


def run(year: int | None, from_year: int | None, batch_size: int) -> None:
    client = get_client()
    current_year = datetime.utcnow().year

    if year is not None:
        years = [year]
    elif from_year is not None:
        years = list(range(from_year, current_year + 1))
    else:
        print("Error: specify --year YYYY or --from-year YYYY")
        sys.exit(1)

    log(f"Backfill Form 4 for years: {years}", job="backfill_form4")

    for y in years:
        try:
            run_year(y, batch_size, client)
        except Exception as e:
            log_error(f"Year {y} CRASHED: {e}", job="backfill_form4")
            # Continue to next year rather than aborting


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill historical Form 4 insider trades by year.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--year",
        type=int,
        help="Single year to backfill (e.g. 2022).",
    )
    group.add_argument(
        "--from-year",
        type=int,
        help="Backfill from this year through the current year (e.g. 2020).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Max number of Form 4 filings to process per year (default: {DEFAULT_BATCH_SIZE}).",
    )
    args = parser.parse_args()

    try:
        run(year=args.year, from_year=args.from_year, batch_size=args.batch_size)
    except Exception as e:
        log_error(f"CRASHED: {e}", job="backfill_form4")
        sys.exit(1)
