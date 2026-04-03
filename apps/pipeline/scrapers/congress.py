import os
import re
from datetime import datetime

import requests

from core.logger import log, log_warning

FMP_BASE_URL = "https://financialmodelingprep.com/stable"

# Amount strings like "$1,001 - $15,000" or "$50,001 - $100,000"
_AMOUNT_RE = re.compile(r"\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)")


def _parse_amount(value: str | None) -> tuple[int | None, int | None]:
    """Parse FMP amount range string into (min, max) integers."""
    if not value:
        return None, None
    m = _AMOUNT_RE.search(str(value))
    if not m:
        return None, None
    try:
        return int(m.group(1).replace(",", "")), int(m.group(2).replace(",", ""))
    except (ValueError, AttributeError):
        return None, None


def _clean(value: str | None) -> str | None:
    if not value:
        return None
    v = str(value).strip()
    return None if v in ("--", "N/A", "") else v


def _fetch_page(endpoint: str, page: int, api_key: str, job: str) -> list[dict] | None:
    url = f"{FMP_BASE_URL}/{endpoint}"
    try:
        resp = requests.get(url, params={"page": page, "apikey": api_key}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "Error Message" in data:
            log_warning(f"FMP error on {endpoint} page {page}: {data['Error Message']}", job=job)
            return None
        return data if isinstance(data, list) else []
    except requests.exceptions.ConnectionError as e:
        log_warning(f"Cannot reach FMP {endpoint}: {e}", job=job)
    except requests.exceptions.Timeout:
        log_warning(f"Timeout reaching FMP {endpoint}", job=job)
    except Exception as e:
        log_warning(f"Error fetching FMP {endpoint}: {e}", job=job)
    return None


def _fetch_all_pages(endpoint: str, api_key: str, since_str: str | None, date_field: str, job: str) -> list[dict]:
    """Fetch all pages from a FMP endpoint, stopping when rows are older than since_str."""
    results = []
    page = 0
    while True:
        rows = _fetch_page(endpoint, page, api_key, job)
        if rows is None:
            break
        if not rows:
            break

        stop = False
        for row in rows:
            date_val = _clean(row.get(date_field) or row.get("transactionDate") or row.get("disclosureDate"))
            if since_str and date_val and date_val < since_str:
                stop = True
                break
            results.append(row)

        if stop:
            break
        page += 1

    return results


def _map_trade_type(value: str | None) -> str:
    if not value:
        return "exchange"
    v = value.lower()
    if any(w in v for w in ("purchase", "buy")):
        return "buy"
    if any(w in v for w in ("sale", "sell")):
        return "sell"
    return "exchange"


def fetch_house(since: datetime | None) -> list[dict]:
    """
    Fetch House congressional trades from Financial Modeling Prep API.
    Requires FMP_API_KEY environment variable with a plan that includes
    congressional trading data.
    """
    api_key = os.getenv("FMP_API_KEY")
    if not api_key:
        log_warning("FMP_API_KEY not set – skipping house trades", job="fetch_congress")
        return []

    since_str = since.strftime("%Y-%m-%d") if since else None
    job = "fetch_congress"

    raw_rows = _fetch_all_pages("house-latest-trading", api_key, since_str, "transactionDate", job)
    log(f"House: {len(raw_rows)} raw records from FMP", job=job)

    if not raw_rows:
        log_warning("House: no data returned from FMP (may require paid tier)", job=job)
        return []

    results = []
    for row in raw_rows:
        amount_min, amount_max = _parse_amount(row.get("amount"))
        results.append({
            "politician_name": _clean(row.get("representative") or row.get("name")),
            "chamber": "house",
            "party": _clean(row.get("party")),
            "state": _clean(row.get("state")),
            "ticker": _clean(row.get("ticker")),
            "company_name": _clean(row.get("assetDescription") or row.get("asset_description")),
            "trade_type": _map_trade_type(row.get("type") or row.get("transactionType")),
            "amount_min": amount_min,
            "amount_max": amount_max,
            "trade_date": _clean(row.get("transactionDate") or row.get("transaction_date")),
            "disclosure_date": _clean(row.get("disclosureDate") or row.get("disclosure_date")),
            "filing_url": _clean(row.get("link") or row.get("pdfLink")),
            "source": "fmp_house",
            "raw": row,
        })

    log(f"House: {len(results)} transactions extracted", job=job)
    return results


def fetch_senate(since: datetime | None) -> list[dict]:
    """
    Fetch Senate congressional trades from Financial Modeling Prep API.
    Requires FMP_API_KEY environment variable with a plan that includes
    congressional trading data.
    """
    api_key = os.getenv("FMP_API_KEY")
    if not api_key:
        log_warning("FMP_API_KEY not set – skipping senate trades", job="fetch_congress")
        return []

    since_str = since.strftime("%Y-%m-%d") if since else None
    job = "fetch_congress"

    raw_rows = _fetch_all_pages("senate-latest-trading", api_key, since_str, "transactionDate", job)
    log(f"Senate: {len(raw_rows)} raw records from FMP", job=job)

    if not raw_rows:
        log_warning("Senate: no data returned from FMP (may require paid tier)", job=job)
        return []

    results = []
    for row in raw_rows:
        amount_min, amount_max = _parse_amount(row.get("amount"))
        name_parts = [row.get("firstName", ""), row.get("lastName", "")]
        name = _clean(" ".join(p for p in name_parts if p)) or _clean(row.get("senator") or row.get("name"))
        results.append({
            "politician_name": name,
            "chamber": "senate",
            "party": _clean(row.get("party")),
            "state": _clean(row.get("state")),
            "ticker": _clean(row.get("ticker")),
            "company_name": _clean(row.get("assetDescription") or row.get("asset_description")),
            "trade_type": _map_trade_type(row.get("type") or row.get("transactionType")),
            "amount_min": amount_min,
            "amount_max": amount_max,
            "trade_date": _clean(row.get("transactionDate") or row.get("transaction_date")),
            "disclosure_date": _clean(row.get("disclosureDate") or row.get("disclosure_date")),
            "filing_url": _clean(row.get("link") or row.get("pdfLink")),
            "source": "fmp_senate",
            "raw": row,
        })

    log(f"Senate: {len(results)} transactions extracted", job=job)
    return results
