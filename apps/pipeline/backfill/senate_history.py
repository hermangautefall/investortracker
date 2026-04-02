"""
One-time backfill script for historical Senate trade data.
Run manually once: python -m backfill.senate_history

Data source: timothycarambat/senate-stock-watcher-data on GitHub.
Uses source='senate_historical_backfill' to distinguish from live data.
"""
import sys

from dotenv import load_dotenv
load_dotenv()

import requests

from core.logger import log, log_error, log_warning
from loaders.supabase_loader import load_congress_trades
from transformers.normalize import normalize_congress_row

URL = "https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/data/all_transactions.json"
SOURCE = "senate_historical_backfill"


def _parse_date(value: str | None) -> str | None:
    """Normalize date strings to ISO 8601."""
    from datetime import datetime
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
    if not value:
        return None
    v = value.strip()
    return None if v in ("--", "N/A", "") else v


def run() -> None:
    log(f"Downloading historical Senate data from {URL}", job="senate_backfill")
    try:
        response = requests.get(URL, timeout=60)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        log_error(f"Failed to download data: {e}", job="senate_backfill")
        sys.exit(1)

    log(f"Downloaded {len(data)} records", job="senate_backfill")

    raw_rows = []
    for row in data:
        transactions = row.get("transactions") or []
        if not transactions:
            continue

        disclosure_str = _parse_date(row.get("date_received") or row.get("disclosure_date"))

        for txn in transactions:
            name_parts = [row.get("first_name", ""), row.get("last_name", "")]
            name = _clean(" ".join(p for p in name_parts if p)) or _clean(row.get("senator_name"))

            raw_rows.append({
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
                "disclosure_date": disclosure_str,
                "filing_url": _clean(row.get("pdf_url") or row.get("filing_url")),
                "source": SOURCE,
                "raw": {"row": row, "transaction": txn},
            })

    log(f"Extracted {len(raw_rows)} transactions", job="senate_backfill")

    valid_trades = []
    valid_raws = []
    skipped = 0
    for raw in raw_rows:
        normalized = normalize_congress_row(raw, job="senate_backfill")
        if normalized is None:
            skipped += 1
        else:
            valid_trades.append(normalized)
            valid_raws.append(raw)

    log(f"Valid: {len(valid_trades)}, skipped: {skipped}", job="senate_backfill")

    if not valid_trades:
        log_error("No valid rows – aborting", job="senate_backfill")
        sys.exit(1)

    inserted, load_skipped = load_congress_trades(valid_trades, valid_raws, job="senate_backfill")
    log(f"Done: {inserted} inserted, {load_skipped} skipped", job="senate_backfill")


if __name__ == "__main__":
    run()
