import math
import os
from datetime import datetime

from edgar import get_filings, set_identity

from core.logger import log, log_warning
from core.rate_limiter import SEC_LIMITER

FORM4_SOURCE = "sec_form4"
MAX_FILINGS_PER_RUN = 500

_CODE_MAP = {
    "P": "buy",
    "S": "sell",
    "A": "buy",   # Award
    "D": "sell",  # Disposition
    "M": "option_exercise",
    "C": "option_exercise",
    "F": "sell",  # Tax withholding
}


def _map_trade_type(code: str | None) -> str | None:
    if not code:
        return None
    return _CODE_MAP.get(str(code).strip().upper())


def fetch_form4(since: datetime) -> list[dict]:
    """
    Fetch Form 4 insider trade filings from SEC EDGAR using edgartools.
    Uses form4.to_dataframe() which returns columns:
      Transaction Type, Code, Description, Shares, Price, Value,
      Date, Form, Issuer, Ticker, Insider, Position, Remaining Shares
    Limits to MAX_FILINGS_PER_RUN per run to prevent timeouts.
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
    seen_accessions: set[str] = set()

    for filing in filings:
        if processed >= MAX_FILINGS_PER_RUN:
            log(
                f"Reached limit of {MAX_FILINGS_PER_RUN} filings – "
                "will continue from checkpoint next run",
                job="fetch_form4",
            )
            break

        accession_no = filing.accession_no or ""
        if accession_no and accession_no in seen_accessions:
            # Group filing: multiple CIKs share one accession — already processed
            skipped += 1
            continue
        if accession_no:
            seen_accessions.add(accession_no)

        SEC_LIMITER.wait()
        try:
            form4 = filing.obj()
            if form4 is None:
                skipped += 1
                continue

            df = form4.to_dataframe()
            if df is None or df.empty:
                skipped += 1
                continue

        except Exception as e:
            log_warning(f"Could not parse filing {filing.accession_no}: {e}", job="fetch_form4")
            skipped += 1
            continue

        cik = str(filing.cik) if filing.cik else ""
        filing_date_str = str(filing.filing_date) if filing.filing_date else None
        form4_url = (
            f"https://www.sec.gov/Archives/edgar/data/{cik}/"
            f"{accession_no.replace('-', '')}/{accession_no}-index.htm"
            if cik and accession_no else None
        )

        for _, row in df.iterrows():
            code = str(row.get("Code") or "")
            trade_type = _map_trade_type(code)
            if not trade_type:
                continue

            shares_raw = row.get("Shares")
            price_raw = row.get("Price")
            value_raw = row.get("Value")
            # pandas NaN values must be converted to None
            shares = None if (shares_raw is None or (isinstance(shares_raw, float) and math.isnan(shares_raw))) else shares_raw
            price = None if (price_raw is None or (isinstance(price_raw, float) and math.isnan(price_raw))) else price_raw
            value = None if (value_raw is None or (isinstance(value_raw, float) and math.isnan(value_raw))) else value_raw
            txn_date = row.get("Date")
            ticker = str(row.get("Ticker") or "").strip().upper()
            insider = str(row.get("Insider") or "").strip()
            company = str(row.get("Issuer") or "").strip()

            # to_dataframe() combines all owners — use first name only
            insider_name = insider.split(" / ")[0].strip() if insider else "Unknown"
            position = str(row.get("Position") or "").strip() or None

            if not ticker:
                continue  # Skip rows with no ticker (derivatives without symbol)

            raw_dict: dict = {}
            for k, v in row.to_dict().items():
                if hasattr(v, "item"):
                    v = v.item()
                if hasattr(v, "isoformat"):
                    raw_dict[k] = v.isoformat()
                elif isinstance(v, float) and (v != v):  # NaN check
                    raw_dict[k] = None
                elif not isinstance(v, (str, int, float, bool, type(None))):
                    raw_dict[k] = str(v)
                else:
                    raw_dict[k] = v

            results.append({
                "insider_name": insider_name,
                "cik": cik,
                "accession_no": accession_no,
                "primary_role": position,
                "primary_company": company or None,
                "ticker": ticker,
                "company_name": company or None,
                "trade_type": trade_type,
                "shares": int(shares) if shares is not None else None,
                "price_per_share": float(price) if price is not None else None,
                "total_value": float(value) if value is not None else None,
                "trade_date": txn_date.strftime("%Y-%m-%d") if hasattr(txn_date, "strftime") else (str(txn_date)[:10] if txn_date else filing_date_str),
                "filing_date": filing_date_str,
                "form4_url": form4_url,
                "source": FORM4_SOURCE,
                "raw": raw_dict,
            })

        processed += 1

    log(
        f"Form 4: {len(results)} transactions from {processed} filings, "
        f"{skipped} filings skipped",
        job="fetch_form4",
    )
    return results
