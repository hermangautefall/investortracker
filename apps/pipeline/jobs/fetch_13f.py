import sys
import time

from dotenv import load_dotenv
load_dotenv()

from core.checkpoint import get_checkpoint, set_checkpoint
from core.db import get_client
from core.logger import log, log_error, log_warning
from core.validator import PortfolioHolding
from loaders.supabase_loader import load_portfolio_holdings
from monitor.alerts import send_alert
from scrapers.edgar_13f import fetch_13f_for_investor

JOB_NAME = "fetch_13f"


def _validate_holding(raw: dict, job: str) -> PortfolioHolding | None:
    """Validate a raw holding dict through Pydantic. Returns None on failure."""
    try:
        return PortfolioHolding(**{k: raw[k] for k in (
            "cik", "ticker", "company_name", "shares",
            "value_usd", "portfolio_weight", "quarter",
            "filing_date", "source",
        ) if k in raw})
    except Exception as e:
        log_warning(f"Validation failed for holding {raw.get('ticker')} / {raw.get('quarter')}: {e}", job=job)
        return None


def run() -> None:
    """
    Incremental 13F superinvestor holdings ingestion job.
    Fetches SEC EDGAR 13F-HR filings for every superinvestor in the DB,
    validates, deduplicates, and loads holdings to portfolio_holdings.
    Writes checkpoint on success; sends Telegram alert and exits 1 on failure.
    One CIK failure never aborts the whole job.
    """
    start = time.time()
    since = get_checkpoint(JOB_NAME)
    log(f"Starting – fetching filings since {since}", job=JOB_NAME)

    rows_inserted = rows_skipped = rows_failed = 0

    try:
        client = get_client()
        result = client.table("superinvestors").select("id, cik, name").execute()
        investors = result.data or []
        log(f"Found {len(investors)} superinvestors to process", job=JOB_NAME)

        if not investors:
            log("No superinvestors in DB – nothing to do", job=JOB_NAME)

        for investor in investors:
            cik = investor.get("cik")
            superinvestor_id = investor.get("id")
            name = investor.get("name", cik)

            if not cik or not superinvestor_id:
                log_warning(f"Skipping investor with missing cik or id: {investor}", job=JOB_NAME)
                rows_skipped += 1
                continue

            try:
                raw_holdings = fetch_13f_for_investor(cik, since=since)
                log(f"{name}: {len(raw_holdings)} raw holdings", job=JOB_NAME)

                valid: list[PortfolioHolding] = []
                for raw in raw_holdings:
                    holding = _validate_holding(raw, job=JOB_NAME)
                    if holding is None:
                        rows_skipped += 1
                    else:
                        valid.append(holding)

                if valid:
                    ins, skip = load_portfolio_holdings(valid, superinvestor_id, job=JOB_NAME)
                    rows_inserted += ins
                    rows_skipped += skip

            except Exception as e:
                log_error(f"{name} (CIK {cik}) failed: {e}", job=JOB_NAME)
                rows_failed += 1
                # Continue to next investor – do not abort the job

        set_checkpoint(JOB_NAME)

        duration = round(time.time() - start, 2)
        status = "partial" if rows_failed > 0 else "success"
        client.table("pipeline_runs").insert({
            "job_name": JOB_NAME,
            "status": status,
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
            "rows_failed": rows_failed,
            "duration_seconds": duration,
        }).execute()
        log(
            f"Done: {rows_inserted} inserted, {rows_skipped} skipped, "
            f"{rows_failed} failed ({duration}s)",
            job=JOB_NAME,
        )

    except Exception as e:
        duration = round(time.time() - start, 2)
        get_client().table("pipeline_runs").insert({
            "job_name": JOB_NAME,
            "status": "failed",
            "error_message": str(e),
            "duration_seconds": duration,
        }).execute()
        send_alert(JOB_NAME, str(e), rows_inserted)
        log_error(f"CRASHED: {e}", job=JOB_NAME)
        sys.exit(1)


if __name__ == "__main__":
    run()
