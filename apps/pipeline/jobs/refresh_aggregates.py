import sys
import time

from dotenv import load_dotenv
load_dotenv()

from aggregators.refresh_views import refresh_all_views, VIEWS
from core.db import get_client
from core.logger import log, log_error
from monitor.alerts import send_alert

JOB_NAME = "refresh_aggregates"


def run() -> None:
    """
    Refresh all materialized views one at a time.
    Partial failures are logged but only cause exit(1)
    if ALL views fail.
    """
    start = time.time()
    log("Starting materialized view refresh", job=JOB_NAME)

    try:
        failures = refresh_all_views()
        duration = round(time.time() - start, 2)

        if failures == 0:
            # Full success
            get_client().table("pipeline_runs").insert({
                "job_name": JOB_NAME,
                "status": "success",
                "duration_seconds": duration,
            }).execute()
            log(f"Done — all views refreshed ({duration}s)", job=JOB_NAME)

        elif failures < len(VIEWS):
            # Partial failure — some views refreshed
            msg = f"{failures}/{len(VIEWS)} views failed to refresh"
            get_client().table("pipeline_runs").insert({
                "job_name": JOB_NAME,
                "status": "partial",
                "error_message": msg,
                "duration_seconds": duration,
            }).execute()
            send_alert(JOB_NAME, msg)
            log(f"Partial success — {msg} ({duration}s)", job=JOB_NAME)
            # Don't exit(1) — the views that succeeded are still useful

        else:
            # All views failed
            msg = "All materialized views failed to refresh"
            get_client().table("pipeline_runs").insert({
                "job_name": JOB_NAME,
                "status": "failed",
                "error_message": msg,
                "duration_seconds": duration,
            }).execute()
            send_alert(JOB_NAME, msg)
            log_error(f"FAILED: {msg} ({duration}s)", job=JOB_NAME)
            sys.exit(1)

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
