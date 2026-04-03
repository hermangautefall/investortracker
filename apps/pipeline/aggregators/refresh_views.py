import time

from core.db import get_client
from core.logger import log, log_error


def refresh_all_views() -> None:
    """
    Refresh all materialized views by calling the
    refresh_materialized_views() PostgreSQL function via RPC.
    """
    client = get_client()
    start = time.time()
    try:
        client.rpc("refresh_materialized_views", {}).execute()
        elapsed = round(time.time() - start, 2)
        log(f"Refreshed all materialized views in {elapsed}s",
            job="refresh_aggregates")
    except Exception as e:
        log_error(f"Failed to refresh views: {e}",
                  job="refresh_aggregates")
        raise
