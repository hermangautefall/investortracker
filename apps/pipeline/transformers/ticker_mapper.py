import os

import requests

from core.logger import log_warning

_cache: dict[str, str | None] = {}

OPENFIGI_URL = "https://api.openfigi.com/v3/mapping"


def resolve_ticker(company_name: str) -> str | None:
    """
    Look up a ticker symbol for a company name via OpenFIGI.
    Results are cached in memory to avoid repeated API calls.
    Returns None if no match found or on any error.
    """
    if company_name in _cache:
        return _cache[company_name]

    try:
        api_key = os.getenv("OPENFIGI_API_KEY", "")
        response = requests.post(
            OPENFIGI_URL,
            json=[{"idType": "NAME", "idValue": company_name, "exchCode": "US"}],
            headers={"X-OPENFIGI-APIKEY": api_key},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        ticker = data[0].get("data", [{}])[0].get("ticker")
        _cache[company_name] = ticker
        return ticker
    except Exception as e:
        log_warning(f"OpenFIGI lookup failed for '{company_name}': {e}")
        _cache[company_name] = None
        return None
