import os
from datetime import datetime

import pandas as pd
from edgar import get_filings, set_identity

from core.logger import log, log_warning
from core.rate_limiter import SEC_LIMITER

FORM4_SOURCE = "sec_form4"
MAX_FILINGS_PER_RUN = 500

_TRANSACTION_TYPE_MAP = {
    "P": "buy",
    "S": "sell",
    "A": "buy",   # Award (treated as acquisition)
    "D": "sell",  # Disposition
    "M": "option_exercise",
    "C": "option_exercise",
    "F": "sell",  # Tax withholding
}


def _map_trade_type(code: str | None) -> str | None:
    """Map SEC transaction code to canonical trade type."""
    if not code:
        return None
    return _TRANSACTION_TYPE_MAP.get(str(code).strip().upper())


def fetch_form4(since: datetime) -> list[dict]:
    """
    Fetch Form 4 insider trade filings from SEC EDGAR using edgartools.
    Applies SEC_LIMITER between each filing fetch.
    Limits to MAX_FILINGS_PER_RUN filings per run to prevent timeouts.
    Returns list of dicts with all required insider trade fields.
    """
    identity = os.getenv("EDGAR_IDENTITY")
    if not identity:
        raise ValueError("EDGAR_IDENTITY environment variable must be set")
    set_identity(identity)

    since_date = since.date() if isinstance(since, datetime) else since
    log(f"Fetching Form 4 filings since {since_date}", job="fetch_form4")

    try:
        filings = get_filings(form="4", filing_date=str(since_date))
    except Exception as e:
        log_warning(f"Could not get filings list: {e}", job="fetch_form4")
        return []

    results = []
    processed = 0
    skipped = 0

    for filing in filings:
        if processed >= MAX_FILINGS_PER_RUN:
            log(f"Reached limit of {MAX_FILINGS_PER_RUN} filings – will continue from checkpoint next run", job="fetch_form4")
            break

        filing_date_str = str(filing.filing_date) if hasattr(filing, "filing_date") else None

        SEC_LIMITER.wait()
        try:
            form4 = filing.obj()
        except Exception as e:
            log_warning(f"Could not parse filing {filing.accession_number}: {e}", job="fetch_form4")
            skipped += 1
            continue

        try:
            df: pd.DataFrame = form4.transactions
        except Exception:
            skipped += 1
            continue

        if df is None or df.empty:
            skipped += 1
            continue

        # Extract issuer/company info
        ticker = None
        company_name = None
        try:
            issuer = form4.issuer
            ticker = str(issuer.trading_symbol).strip().upper() if hasattr(issuer, "trading_symbol") else None
            company_name = str(issuer.name).strip() if hasattr(issuer, "name") else None
        except Exception:
            pass

        # Extract insider info
        insider_name = None
        cik = str(filing.cik) if hasattr(filing, "cik") else None
        try:
            owner = form4.reporting_owner
            insider_name = str(owner.name).strip() if hasattr(owner, "name") else None
        except Exception:
            pass

        accession_no = getattr(filing, "accession_number", None) or getattr(filing, "accession_no", None) or ""
        form4_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession_no.replace('-', '')}/{accession_no}-index.htm" if cik and accession_no else None

        for _, txn_row in df.iterrows():
            raw_code = txn_row.get("transaction_code") or txn_row.get("transactionCode")
            trade_type = _map_trade_type(raw_code)
            if not trade_type:
                continue  # Skip non-standard transaction codes

            shares = txn_row.get("shares") or txn_row.get("transactionShares")
            price = txn_row.get("price_per_share") or txn_row.get("transactionPricePerShare")
            txn_date = txn_row.get("transaction_date") or txn_row.get("transactionDate")

            try:
                total_value = float(shares or 0) * float(price or 0) if shares and price else None
            except (ValueError, TypeError):
                total_value = None

            raw_dict = txn_row.to_dict()
            # Convert non-serializable types
            for k, v in raw_dict.items():
                if hasattr(v, "item"):
                    raw_dict[k] = v.item()
                elif not isinstance(v, (str, int, float, bool, type(None))):
                    raw_dict[k] = str(v)

            results.append({
                "insider_name": insider_name or "Unknown",
                "cik": cik or "",
                "ticker": ticker or "",
                "company_name": company_name,
                "trade_type": trade_type,
                "shares": int(shares) if shares is not None else None,
                "price_per_share": float(price) if price is not None else None,
                "total_value": total_value,
                "trade_date": str(txn_date)[:10] if txn_date else filing_date_str,
                "filing_date": filing_date_str,
                "form4_url": form4_url,
                "source": FORM4_SOURCE,
                "raw": raw_dict,
            })

        processed += 1

    log(f"Form 4: {len(results)} transactions from {processed} filings, {skipped} filings skipped", job="fetch_form4")
    return results
