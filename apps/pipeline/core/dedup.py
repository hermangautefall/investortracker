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
    """
    parts = [
        str(row.get("cik", "") or ""),
        str(row.get("ticker", "") or ""),
        str(row.get("trade_date", "") or ""),
        str(row.get("shares", "") or ""),
        str(row.get("trade_type", "") or ""),
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def make_holding_key(row: dict) -> str:
    """Stable dedup key for 13F portfolio holdings (Phase 2)."""
    parts = [
        str(row.get("cik", "") or ""),
        str(row.get("ticker", "") or ""),
        str(row.get("quarter", "") or ""),
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()
