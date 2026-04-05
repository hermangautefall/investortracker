import hashlib


def make_congress_key(row: dict) -> str:
    """
    Stable dedup key for congressional trades.
    Based on immutable fields – not on IDs that may change.
    """
    parts = [
        str(row.get("politician_name", "") or ""),
        str(row.get("ticker", "") or ""),
        str(row.get("trade_date", "") or ""),
        str(row.get("trade_type", "") or ""),
        str(row.get("amount_min", "") or ""),
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def make_form4_key(row: dict) -> str:
    """
    Stable dedup key for Form 4 insider trades.
    Includes accession_no + insider_name to handle filings with multiple
    reporting owners that share the same accession number.
    """
    parts = [
        str(row.get("cik", "") or ""),
        str(row.get("accession_no", "") or ""),
        str(row.get("insider_name", "") or ""),
        str(row.get("ticker", "") or ""),
        str(row.get("trade_date", "") or ""),
        str(row.get("shares", "") or ""),
        str(row.get("trade_type", "") or ""),
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def make_holding_key(row: dict) -> str:
    """
    Stable dedup key for 13F portfolio holdings.
    CUSIP is the most reliable identifier (always present in 13F).
    Falls back to ticker, then company_name for edge cases.
    """
    identifier = str(row.get("cusip") or row.get("ticker") or row.get("company_name") or "")
    parts = [
        str(row.get("cik", "") or ""),
        identifier,
        str(row.get("quarter", "") or ""),
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()
