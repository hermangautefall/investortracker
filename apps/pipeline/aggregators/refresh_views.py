import time

from core.db import get_client
from core.logger import log, log_error

VIEWS = ["ticker_activity_summary", "politician_summary"]


def refresh_all_views() -> None:
    """
    Refresh both materialized views without locking the table.
    CONCURRENTLY requires the UNIQUE indexes created in the schema migration.
    """
    client = get_client()
    for view in VIEWS:
        start = time.time()
        try:
            client.rpc(
                "exec_sql",
                {"sql": f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}"},
            ).execute()
            elapsed = round(time.time() - start, 2)
            log(f"Refreshed {view} in {elapsed}s")
        except Exception as e:
            log_error(f"Failed to refresh {view}: {e}")
            raise
