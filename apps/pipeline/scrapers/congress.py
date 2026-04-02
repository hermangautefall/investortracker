import requests
from datetime import datetime, date

from core.logger import log, log_warning
from core.rate_limiter import SEC_LIMITER

HOUSE_API = "https://housestockwatcher.com/api"
SENATE_API = "https://senatestockwatcher.com/api"


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


def fetch_house(since: datetime | None) -> list[dict]:
    """
    Fetch congressional trades from House Stock Watcher API.
    Skips rows with no transactions (PDF-only submissions).
    Filters to rows where disclosure_date >= since if provided.
    Returns raw dicts with source='house_api'.
    """
    SEC_LIMITER.wait()
    response = requests.get(HOUSE_API, timeout=30)
    response.raise_for_status()
    data = response.json()
    log(f"House API returned {len(data)} total records")

    results = []
    skipped = 0
    for row in data:
        # Skip PDF submissions with no transaction data
        if not row.get("transactions"):
            skipped += 1
            continue

        disclosure_str = _parse_date(row.get("disclosure_date") or row.get("disclosureDate"))
        if since and disclosure_str:
            try:
                disc_date = datetime.strptime(disclosure_str, "%Y-%m-%d")
                if disc_date < since:
                    continue
            except ValueError:
                pass

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
    Fetch congressional trades from Senate Stock Watcher API.
    Filters to rows where date_received >= since if provided.
    Returns raw dicts with source='senate_api'.
    """
    SEC_LIMITER.wait()
    response = requests.get(SENATE_API, timeout=30)
    response.raise_for_status()
    data = response.json()
    log(f"Senate API returned {len(data)} total records")

    results = []
    for row in data:
        if not row.get("transactions"):
            continue

        received_str = _parse_date(row.get("date_received") or row.get("disclosure_date"))
        if since and received_str:
            try:
                recv_date = datetime.strptime(received_str, "%Y-%m-%d")
                if recv_date < since:
                    continue
            except ValueError:
                pass

        for txn in row.get("transactions", []):
            results.append({
                "politician_name": _clean(row.get("first_name", "") + " " + row.get("last_name", ""))
                    or _clean(row.get("senator_name") or row.get("name")),
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
