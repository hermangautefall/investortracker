import sys
import time

from dotenv import load_dotenv
load_dotenv()

from aggregators.refresh_views import refresh_all_views
from core.db import get_client
from core.logger import log, log_error
from monitor.alerts import send_alert

JOB_NAME = "refresh_aggregates"


def run() -> None:
    """
    Refresh both materialized views (ticker_activity_summary, politician_summary).
    Uses REFRESH CONCURRENTLY to avoid table locks.
    """
    start = time.time()
    log("Starting materialized view refresh", job=JOB_NAME)

    try:
        refresh_all_views()

        duration = round(time.time() - start, 2)
        get_client().table("pipeline_runs").insert({
            "job_name": JOB_NAME,
            "status": "success",
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
