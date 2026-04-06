"""
Historical 13F backfill — fetches ALL quarters for every superinvestor.

Differences from fetch_13f.py (the daily job):
  - No MAX_FILINGS_PER_INVESTOR cap — goes back as far as EDGAR has records.
  - Smart skipping: checks which quarters are already in portfolio_holdings
    for each investor; only fetches filings for missing quarters.
  - Saves progress to backfill_state so runs can be resumed after interruption.
  - Dry-run mode: prints what would be inserted without touching the DB.

Usage:
    python backfill/backfill_13f.py
    python backfill/backfill_13f.py --batch-size 100 --start-cik 0001234567
    python backfill/backfill_13f.py --dry-run

Prerequisite — run migration 009_backfill_state.sql in Supabase:
    CREATE TABLE IF NOT EXISTS backfill_state (
        job_name TEXT PRIMARY KEY, last_cik TEXT,
        total_processed INT DEFAULT 0, total_inserted INT DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE, updated_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

import argparse
import math
import os
import sys
import time
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from edgar import Company, set_identity

from core.db import get_client
from core.dedup import make_holding_key
from core.logger import log, log_error, log_warning
from core.rate_limiter import SEC_LIMITER
from core.validator import PortfolioHolding
from loaders.supabase_loader import load_portfolio_holdings

JOB_NAME = "backfill_13f"
DEFAULT_BATCH_SIZE = 200  # max holdings to insert per run (not per investor)


# ---------------------------------------------------------------------------
# Backfill state helpers
# ---------------------------------------------------------------------------

def load_state(client) -> dict:
    try:
        result = client.table("backfill_state").select("*").eq("job_name", JOB_NAME).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        log_warning(f"Could not read backfill_state: {e}", job=JOB_NAME)
    return {}


def save_state(client, last_cik: str | None, total_processed: int, total_inserted: int, completed: bool = False) -> None:
    try:
        client.table("backfill_state").upsert({
            "job_name": JOB_NAME,
            "last_cik": last_cik,
            "total_processed": total_processed,
            "total_inserted": total_inserted,
            "completed": completed,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="job_name").execute()
    except Exception as e:
        log_warning(f"Could not save backfill_state: {e}", job=JOB_NAME)


# ---------------------------------------------------------------------------
# EDGAR helpers (no MAX_FILINGS cap)
# ---------------------------------------------------------------------------

def _safe(val):
    """Convert NaN / None to None."""
    if val is None:
        return None
    try:
        if math.isnan(float(val)):
            return None
    except (TypeError, ValueError):
        pass
    return val


def _date_to_quarter(date_str: str) -> str:
    """'2025-12-31' → '2025Q4'."""
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
        q = (d.month - 1) // 3 + 1
        return f"{d.year}Q{q}"
    except Exception:
        return date_str[:7] if date_str else "unknown"


def fetch_all_13f_for_investor(cik: str, skip_quarters: set) -> list[dict]:
    """
    Fetch 13F-HR holdings for one CIK with NO filing cap.
    Skips any quarter already represented in skip_quarters.
    Returns list of raw holding dicts.
    """
    set_identity(os.getenv("EDGAR_IDENTITY", ""))
    results = []

    try:
        company = Company(int(cik))
        SEC_LIMITER.wait()

        filings = company.get_filings(form="13F-HR")
        if filings is None or len(filings) == 0:
            log_warning(f"No 13F filings for CIK {cik}", job=JOB_NAME)
            return []

        for filing in filings:
            SEC_LIMITER.wait()

            period = str(filing.period_of_report or "")
            quarter = _date_to_quarter(period)

            if quarter in skip_quarters:
                log(f"  CIK {cik}: skip {quarter} (already in DB)", job=JOB_NAME)
                continue

            try:
                thirteenf = filing.obj()
                if thirteenf is None:
                    continue

                holdings_df = thirteenf.holdings
                if holdings_df is None or holdings_df.empty:
                    continue

                total_value = holdings_df["Value"].sum() if "Value" in holdings_df.columns else 0

                for _, row in holdings_df.iterrows():
                    value = _safe(row.get("Value"))
                    weight = None
                    if value and total_value:
                        try:
                            weight = round(float(value) / float(total_value) * 100, 4)
                        except (TypeError, ValueError):
                            pass

                    results.append({
                        "cik": cik,
                        "cusip": _safe(row.get("Cusip")),
                        "ticker": _safe(row.get("Ticker")) or None,
                        "company_name": _safe(row.get("Issuer")),
                        "shares": _safe(row.get("SharesPrnAmount")),
                        "value_usd": value,
                        "portfolio_weight": weight,
                        "quarter": quarter,
                        "filing_date": str(filing.filing_date or ""),
                        "source": "sec_13f",
                        "raw": row.to_dict(),
                    })

            except Exception as e:
                log_warning(
                    f"Could not parse 13F filing {filing.accession_number} for CIK {cik}: {e}",
                    job=JOB_NAME,
                )
                continue

    except Exception as e:
        log_warning(f"Could not fetch filings for CIK {cik}: {e}", job=JOB_NAME)

    log(f"CIK {cik}: fetched {len(results)} holdings across all quarters", job=JOB_NAME)
    return results


# ---------------------------------------------------------------------------
# Validation (same as fetch_13f.py)
# ---------------------------------------------------------------------------

def _validate_holding(raw: dict) -> PortfolioHolding | None:
    try:
        return PortfolioHolding(**{k: raw[k] for k in (
            "cik", "ticker", "company_name", "shares",
            "value_usd", "portfolio_weight", "quarter",
            "filing_date", "source",
        ) if k in raw})
    except Exception as e:
        log_warning(
            f"Validation failed for {raw.get('ticker')} / {raw.get('quarter')}: {e}",
            job=JOB_NAME,
        )
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(batch_size: int, start_cik: str | None, dry_run: bool) -> None:
    start = time.time()
    log(
        f"Starting – batch_size={batch_size}, start_cik={start_cik}, dry_run={dry_run}",
        job=JOB_NAME,
    )

    client = get_client()

    # Load investors
    result = client.table("superinvestors").select("id, cik, name").order("cik").execute()
    investors = result.data or []
    log(f"Found {len(investors)} superinvestors", job=JOB_NAME)

    # Load prior state
    state = load_state(client)
    if state.get("completed"):
        log("Backfill already marked completed. Delete backfill_state row to re-run.", job=JOB_NAME)
        return

    cumulative_processed = state.get("total_processed", 0)
    cumulative_inserted  = state.get("total_inserted", 0)
    resume_cik = state.get("last_cik") or start_cik

    # Determine which investors to process (resume support)
    if resume_cik:
        cik_list = [inv["cik"] for inv in investors]
        try:
            resume_idx = cik_list.index(resume_cik)
        except ValueError:
            log_warning(f"Resume CIK {resume_cik} not found in investors – starting from beginning", job=JOB_NAME)
            resume_idx = 0
        investors = investors[resume_idx:]
        log(f"Resuming from CIK {resume_cik} ({len(investors)} investors remaining)", job=JOB_NAME)

    holdings_this_run = 0
    last_cik_processed = resume_cik

    for investor in investors:
        cik = investor.get("cik")
        superinvestor_id = investor.get("id")
        name = investor.get("name", cik)

        if not cik or not superinvestor_id:
            log_warning(f"Skipping investor with missing cik or id: {investor}", job=JOB_NAME)
            continue

        # Check which quarters already exist for this investor
        try:
            existing_result = (
                client.table("portfolio_holdings")
                .select("quarter")
                .eq("investor_id", superinvestor_id)
                .execute()
            )
            skip_quarters = set(r["quarter"] for r in (existing_result.data or []))
        except Exception as e:
            log_warning(f"Could not check existing quarters for {name}: {e}", job=JOB_NAME)
            skip_quarters = set()

        log(
            f"{name} (CIK {cik}): {len(skip_quarters)} quarters already in DB",
            job=JOB_NAME,
        )

        try:
            raw_holdings = fetch_all_13f_for_investor(cik, skip_quarters)
        except Exception as e:
            log_error(f"{name} (CIK {cik}) fetch failed: {e}", job=JOB_NAME)
            last_cik_processed = cik
            continue

        if not raw_holdings:
            last_cik_processed = cik
            cumulative_processed += 1
            continue

        valid: list[PortfolioHolding] = []
        for raw in raw_holdings:
            holding = _validate_holding(raw)
            if holding is not None:
                valid.append(holding)

        log(f"  {name}: {len(valid)} valid holdings to insert", job=JOB_NAME)

        if valid and not dry_run:
            ins, skip = load_portfolio_holdings(valid, superinvestor_id, job=JOB_NAME)
            holdings_this_run += ins
            cumulative_inserted += ins
            log(f"  {name}: inserted {ins}, skipped {skip}", job=JOB_NAME)
        elif dry_run:
            log(f"  [DRY RUN] would insert {len(valid)} holdings for {name}", job=JOB_NAME)
            holdings_this_run += len(valid)

        last_cik_processed = cik
        cumulative_processed += 1

        # Save state after each investor
        if not dry_run:
            save_state(client, last_cik_processed, cumulative_processed, cumulative_inserted)

        # Stop if we've hit the batch size for this run
        if holdings_this_run >= batch_size:
            log(
                f"Reached batch limit of {batch_size} holdings. "
                f"Re-run to continue from CIK {last_cik_processed}.",
                job=JOB_NAME,
            )
            break
    else:
        # Loop completed without hitting batch limit — all done
        log("All investors processed.", job=JOB_NAME)
        if not dry_run:
            save_state(client, last_cik_processed, cumulative_processed, cumulative_inserted, completed=True)

    duration = round(time.time() - start, 2)
    log(
        f"Run complete: {holdings_this_run} holdings this run, "
        f"{cumulative_inserted} total inserted, {cumulative_processed} investors done "
        f"({duration}s)",
        job=JOB_NAME,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill historical 13F holdings for all superinvestors.")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Max holdings to insert per run (default: {DEFAULT_BATCH_SIZE}). Re-run to continue.",
    )
    parser.add_argument(
        "--start-cik",
        type=str,
        default=None,
        help="CIK to start from (overrides saved resume state). Useful for first-run targeting.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted without writing to the DB.",
    )
    args = parser.parse_args()

    try:
        run(batch_size=args.batch_size, start_cik=args.start_cik, dry_run=args.dry_run)
    except Exception as e:
        log_error(f"CRASHED: {e}", job=JOB_NAME)
        sys.exit(1)
