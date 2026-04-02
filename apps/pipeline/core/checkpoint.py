from datetime import datetime, timezone, timedelta

from core.db import get_client
from core.logger import log


def get_checkpoint(job_name: str) -> datetime | None:
    """
    Get last successful run time for a job, minus overlap window.
    The overlap (default 48h) catches delayed or corrected filings.
    Returns None if job has never run (first run = fetch everything).
    """
    client = get_client()
    result = (
        client.table("pipeline_state")
        .select("last_run, overlap_hours")
        .eq("job_name", job_name)
        .maybe_single()
        .execute()
    )
    if not result.data or not result.data.get("last_run"):
        log(f"No checkpoint found for {job_name} – will fetch all data", job=job_name)
        return None
    last_run = datetime.fromisoformat(result.data["last_run"])
    overlap = timedelta(hours=result.data.get("overlap_hours", 48))
    since = last_run - overlap
    log(f"Checkpoint: {last_run.isoformat()} (fetching from {since.isoformat()})", job=job_name)
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
