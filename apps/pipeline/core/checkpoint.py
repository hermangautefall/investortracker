from datetime import datetime, timezone, timedelta

from core.db import get_client
from core.logger import log

FIRST_RUN_LOOKBACK_DAYS = 90


def get_checkpoint(job_name: str) -> datetime:
    """
    Get last successful run time minus overlap window.
    On first run (no checkpoint): returns 90 days ago.
    This prevents fetching all historical data on the first run.
    """
    client = get_client()
    result = (
        client.table("pipeline_state")
        .select("last_run, overlap_hours")
        .eq("job_name", job_name)
        .maybe_single()
        .execute()
    )
    if result is None or not result.data or not result.data.get("last_run"):
        default_since = datetime.now(timezone.utc) - timedelta(days=FIRST_RUN_LOOKBACK_DAYS)
        log(
            f"No checkpoint for {job_name} – defaulting to {FIRST_RUN_LOOKBACK_DAYS} days ago "
            f"({default_since.strftime('%Y-%m-%d')})",
            job=job_name,
        )
        return default_since

    last_run = datetime.fromisoformat(result.data["last_run"])
    overlap = timedelta(hours=result.data.get("overlap_hours", 48))
    since = last_run - overlap
    log(f"Checkpoint: fetching from {since.isoformat()}", job=job_name)
    return since


def set_checkpoint(job_name: str, last_accession_id: str | None = None) -> None:
    """Save successful checkpoint with optional last accession ID."""
    client = get_client()
    client.table("pipeline_state").upsert({
        "job_name": job_name,
        "last_run": datetime.now(timezone.utc).isoformat(),
        "last_accession_id": last_accession_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
