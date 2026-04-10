import time

from core.db import get_client
from core.logger import log, log_error

VIEWS = [
    "ticker_activity_summary",
    "politician_summary",
    "superinvestor_consensus",
    "superinvestor_latest_holdings",
]


def refresh_all_views() -> int:
    """
    Refresh each materialized view individually via the
    refresh_single_view() RPC function. This avoids statement
    timeout on Supabase free tier by setting a 5-minute timeout
    per view inside the SQL function.

    Returns the number of views that failed (0 = full success).
    """
    client = get_client()
    failures = 0

    for view in VIEWS:
        start = time.time()
        try:
            client.rpc(
                "refresh_single_view",
                {"view_name": view},
            ).execute()
            elapsed = round(time.time() - start, 2)
            log(f"Refreshed {view} in {elapsed}s",
                job="refresh_aggregates")
        except Exception as e:
            elapsed = round(time.time() - start, 2)
            log_error(
                f"Failed to refresh {view} after {elapsed}s: {e}",
                job="refresh_aggregates",
            )
            failures += 1
            # Continue to next view — don't crash the whole job

    return failures
