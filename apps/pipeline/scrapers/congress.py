import requests
from datetime import datetime

from core.logger import log, log_warning

HOUSE_S3_URL = "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json"
HOUSE_API_URL = "https://housestockwatcher.com/api"

SENATE_S3_URL = "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json"
SENATE_API_URL = "https://senatestockwatcher.com/api"


def _parse_date(value: str | None) -> str | None:
    """Normalize various date formats to ISO 8601 (YYYY-MM-DD)."""
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value


def _clean(value: str | None) -> str | None:
    """Strip whitespace and convert placeholder values to None."""
    if not value:
        return None
    v = value.strip()
    return None if v in ("--", "N/A", "") else v


def _fetch_json(urls: list[str], job: str) -> list[dict] | None:
    """
    Try each URL in order, returning parsed JSON on first success.
    Returns None if all sources fail.
    """
    for url in urls:
        try:
            log(f"Fetching from {url}", job=job)
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            # Some endpoints wrap data in {"data": [...]}
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            return data
        except requests.exceptions.ConnectionError as e:
            log_warning(f"Cannot reach {url}: {e}", job=job)
        except requests.exceptions.Timeout:
            log_warning(f"Timeout reaching {url}", job=job)
        except Exception as e:
            log_warning(f"Error fetching from {url}: {e}", job=job)
    return None


def fetch_house(since: datetime | None) -> list[dict]:
    """
    Fetch House congressional trades.
    Tries S3 bucket first (more stable), falls back to API.
    Skips rows with no transactions (PDF-only submissions).
    """
    data = _fetch_json([HOUSE_S3_URL, HOUSE_API_URL], job="fetch_congress")
    if data is None:
        log_warning("All house data sources failed – returning empty list", job="fetch_congress")
        return []

    log(f"House: {len(data)} total records fetched")

    results = []
    skipped = 0
    since_str = since.strftime("%Y-%m-%d") if since else None

    for row in data:
        if not row.get("transactions"):
            skipped += 1
            continue

        disclosure_str = _parse_date(row.get("disclosure_date") or row.get("disclosureDate"))
        if since_str and disclosure_str and disclosure_str < since_str:
            continue

        for txn in row.get("transactions", []):
            results.append({
                "politician_name": _clean(row.get("representative") or row.get("name")),
                "chamber": "house",
                "party": _clean(row.get("party")),
                "state": _clean(row.get("state")),
                "ticker": _clean(txn.get("ticker")),
                "company_name": _clean(txn.get("asset_description") or txn.get("company")),
                "trade_type": _clean(txn.get("type") or txn.get("transaction_type")),
                "amount_min": txn.get("amount_min") or txn.get("min"),
                "amount_max": txn.get("amount_max") or txn.get("max"),
                "trade_date": _parse_date(txn.get("transaction_date") or txn.get("trade_date")),
                "disclosure_date": disclosure_str,
                "filing_url": _clean(row.get("pdf_url") or row.get("filing_url")),
                "source": "house_api",
                "raw": {"row": row, "transaction": txn},
            })

    log(f"House: {len(results)} transactions extracted, {skipped} PDF-only rows skipped")
    return results


def fetch_senate(since: datetime | None) -> list[dict]:
    """
    Fetch Senate congressional trades.
    Tries S3 bucket first (more stable), falls back to API.
    """
    data = _fetch_json([SENATE_S3_URL, SENATE_API_URL], job="fetch_congress")
    if data is None:
        log_warning("All senate data sources failed – returning empty list", job="fetch_congress")
        return []

    log(f"Senate: {len(data)} total records fetched")

    results = []
    since_str = since.strftime("%Y-%m-%d") if since else None

    for row in data:
        if not row.get("transactions"):
            continue

        received_str = _parse_date(row.get("date_received") or row.get("disclosure_date"))
        if since_str and received_str and received_str < since_str:
            continue

        for txn in row.get("transactions", []):
            name_parts = [row.get("first_name", ""), row.get("last_name", "")]
            name = _clean(" ".join(p for p in name_parts if p)) or _clean(
                row.get("senator_name") or row.get("name")
            )
            results.append({
                "politician_name": name,
                "chamber": "senate",
                "party": _clean(row.get("party")),
                "state": _clean(row.get("state")),
                "ticker": _clean(txn.get("ticker")),
                "company_name": _clean(txn.get("asset_description") or txn.get("company")),
                "trade_type": _clean(txn.get("type") or txn.get("transaction_type")),
                "amount_min": txn.get("amount_min") or txn.get("min"),
                "amount_max": txn.get("amount_max") or txn.get("max"),
                "trade_date": _parse_date(txn.get("transaction_date") or txn.get("trade_date")),
                "disclosure_date": received_str,
                "filing_url": _clean(row.get("pdf_url") or row.get("filing_url")),
                "source": "senate_api",
                "raw": {"row": row, "transaction": txn},
            })

    log(f"Senate: {len(results)} transactions extracted")
    return results
