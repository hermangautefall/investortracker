import sys
import time

from dotenv import load_dotenv
load_dotenv()

from core.checkpoint import get_checkpoint, set_checkpoint
from core.db import get_client
from core.logger import log, log_error
from loaders.supabase_loader import load_congress_trades
from monitor.alerts import send_alert
from scrapers.congress import fetch_house, fetch_senate
from transformers.normalize import normalize_congress_row

JOB_NAME = "fetch_congress"


def run() -> None:
    """
    Incremental congressional trade ingestion job.
    Fetches House + Senate APIs, validates, deduplicates, and loads to DB.
    Writes checkpoint on success; sends Telegram alert and exits 1 on failure.
    """
    start = time.time()
    since = get_checkpoint(JOB_NAME)
    log(f"Starting – fetching data since {since}", job=JOB_NAME)

    rows_inserted = rows_skipped = rows_failed = 0

    try:
        raw_house = fetch_house(since)
        raw_senate = fetch_senate(since)
        all_raw = raw_house + raw_senate
        log(f"Fetched {len(all_raw)} raw rows", job=JOB_NAME)

        valid_trades = []
        valid_raws = []
        for raw in all_raw:
            normalized = normalize_congress_row(raw, job=JOB_NAME)
            if normalized is None:
                rows_skipped += 1
            else:
                valid_trades.append(normalized)
                valid_raws.append(raw)

        log(f"Valid rows: {len(valid_trades)}, skipped: {rows_skipped}", job=JOB_NAME)

        if valid_trades:
            ins, skip = load_congress_trades(valid_trades, valid_raws, job=JOB_NAME)
            rows_inserted += ins
            rows_skipped += skip

        set_checkpoint(JOB_NAME)

        duration = round(time.time() - start, 2)
        status = "partial" if rows_failed > 0 else "success"
        get_client().table("pipeline_runs").insert({
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
