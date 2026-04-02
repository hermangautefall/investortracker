from core.db import get_client
from core.dedup import make_congress_key, make_form4_key
from core.logger import log, log_error
from core.validator import CongressTrade, InsiderTrade

BATCH_SIZE = 100


def load_congress_trades(
    trades: list[CongressTrade],
    raw_rows: list[dict],
    job: str = "load_congress",
) -> tuple[int, int]:
    """
    Upsert congressional trades to database in batches of BATCH_SIZE.
    Politician upsert is handled separately before trade insert.
    Returns (rows_inserted, rows_skipped).
    """
    client = get_client()
    inserted = 0
    skipped = 0

    rows = []
    for trade, raw in zip(trades, raw_rows):
        dedup_key = make_congress_key({
            "politician_name": trade.politician_name,
            "ticker": trade.ticker,
            "trade_date": str(trade.trade_date),
            "trade_type": trade.trade_type,
            "amount_min": trade.amount_min,
        })

        # Upsert politician and get ID
        politician_id = _upsert_politician(client, trade)

        rows.append({
            "dedup_key": dedup_key,
            "politician_id": politician_id,
            "ticker": trade.ticker,
            "company_name": trade.company_name,
            "trade_type": trade.trade_type,
            "amount_min": trade.amount_min,
            "amount_max": trade.amount_max,
            "trade_date": str(trade.trade_date),
            "disclosure_date": str(trade.disclosure_date),
            "filing_url": trade.filing_url,
            "source": trade.source,
            "raw": raw,
        })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            client.table("congress_trades").upsert(
                batch, on_conflict="dedup_key"
            ).execute()
            inserted += len(batch)
            log(f"Batch {i // BATCH_SIZE + 1}: inserted {len(batch)} rows", job=job)
        except Exception as e:
            log_error(f"Batch {i // BATCH_SIZE + 1} failed: {e}", job=job)
            skipped += len(batch)

    return inserted, skipped


def load_insider_trades(
    trades: list[InsiderTrade],
    raw_rows: list[dict],
    job: str = "load_form4",
) -> tuple[int, int]:
    """
    Upsert insider trades to database in batches of BATCH_SIZE.
    Insider upsert is handled separately before trade insert.
    Returns (rows_inserted, rows_skipped).
    """
    client = get_client()
    inserted = 0
    skipped = 0

    rows = []
    for trade, raw in zip(trades, raw_rows):
        dedup_key = make_form4_key({
            "cik": trade.cik,
            "ticker": trade.ticker,
            "trade_date": str(trade.trade_date),
            "shares": trade.shares,
            "trade_type": trade.trade_type,
        })

        insider_id = _upsert_insider(client, trade)

        rows.append({
            "dedup_key": dedup_key,
            "insider_id": insider_id,
            "ticker": trade.ticker,
            "company_name": trade.company_name,
            "trade_type": trade.trade_type,
            "shares": trade.shares,
            "price_per_share": float(trade.price_per_share) if trade.price_per_share else None,
            "total_value": float(trade.total_value) if trade.total_value else None,
            "trade_date": str(trade.trade_date),
            "filing_date": str(trade.filing_date),
            "form4_url": trade.form4_url,
            "source": "sec_form4",
            "raw": raw,
        })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            client.table("insider_trades").upsert(
                batch, on_conflict="dedup_key"
            ).execute()
            inserted += len(batch)
            log(f"Batch {i // BATCH_SIZE + 1}: inserted {len(batch)} rows", job=job)
        except Exception as e:
            log_error(f"Batch {i // BATCH_SIZE + 1} failed: {e}", job=job)
            skipped += len(batch)

    return inserted, skipped


def _upsert_politician(client, trade: CongressTrade) -> str | None:
    """
    Upsert politician by full_name + chamber. Returns the politician's UUID.
    Uses upsert to avoid duplicates across runs.
    """
    try:
        result = client.table("politicians").upsert(
            {
                "full_name": trade.politician_name,
                "chamber": trade.chamber,
                "party": trade.party,
                "state": trade.state,
            },
            on_conflict="full_name,chamber",
            ignore_duplicates=False,
        ).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception:
        # Fall back to lookup if upsert fails
        try:
            result = (
                client.table("politicians")
                .select("id")
                .eq("full_name", trade.politician_name)
                .eq("chamber", trade.chamber)
                .single()
                .execute()
            )
            if result.data:
                return result.data["id"]
        except Exception:
            pass
    return None


def _upsert_insider(client, trade: InsiderTrade) -> str | None:
    """
    Upsert insider by CIK. Returns the insider's UUID.
    """
    try:
        result = client.table("insiders").upsert(
            {"name": trade.insider_name, "cik": trade.cik},
            on_conflict="cik",
            ignore_duplicates=False,
        ).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception:
        try:
            result = (
                client.table("insiders")
                .select("id")
                .eq("cik", trade.cik)
                .single()
                .execute()
            )
            if result.data:
                return result.data["id"]
        except Exception:
            pass
    return None
