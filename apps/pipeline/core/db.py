import os

from supabase import create_client, Client

from core.logger import log_error

_client: Client | None = None


def get_client() -> Client:
    """Return singleton Supabase client using service role key."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _client = create_client(url, key)
    return _client
