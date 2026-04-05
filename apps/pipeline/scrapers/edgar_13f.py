import math
import os
from datetime import datetime

from edgar import Company, set_identity

from core.rate_limiter import SEC_LIMITER
from core.logger import log, log_warning

MAX_FILINGS_PER_INVESTOR = 4


def fetch_13f_for_investor(cik: str, since: datetime | None = None) -> list[dict]:
    """
    Fetch 13F-HR portfolio holdings for one investor CIK.
    Returns list of holding dicts, one per position per quarter.
    Only fetches filings newer than 'since' if provided.
    Caps at MAX_FILINGS_PER_INVESTOR quarters to avoid backfilling all history.
    """
    set_identity(os.getenv("EDGAR_IDENTITY", ""))

    results = []

    try:
        company = Company(int(cik))
        SEC_LIMITER.wait()

        filings = company.get_filings(form="13F-HR")
        if filings is None or len(filings) == 0:
            log_warning(f"No 13F filings found for CIK {cik}", job="fetch_13f")
            return []

        filings_processed = 0
        for filing in filings:
            if filings_processed >= MAX_FILINGS_PER_INVESTOR:
                break

            SEC_LIMITER.wait()

            # Skip if older than checkpoint (filings are newest-first)
            if since and filing.filing_date:
                filing_dt = datetime.strptime(str(filing.filing_date), "%Y-%m-%d")
                # Make naive for comparison (since may be tz-aware)
                since_naive = since.replace(tzinfo=None) if since.tzinfo else since
                if filing_dt < since_naive:
                    break

            try:
                thirteenf = filing.obj()
                if thirteenf is None:
                    continue

                holdings_df = thirteenf.holdings
                if holdings_df is None or holdings_df.empty:
                    continue

                period = str(filing.period_of_report or "")
                quarter = _date_to_quarter(period)

                for _, row in holdings_df.iterrows():
                    results.append({
                        "cik": cik,
                        "ticker": _safe(row.get("ticker")),
                        "company_name": _safe(row.get("name")),
                        "shares": _safe(row.get("shares")),
                        "value_usd": _safe(row.get("value")),
                        "portfolio_weight": _safe(row.get("portfolio_percent")),
                        "quarter": quarter,
                        "filing_date": str(filing.filing_date or ""),
                        "source": "sec_13f",
                        "raw": row.to_dict(),
                    })

                filings_processed += 1

            except Exception as e:
                log_warning(
                    f"Could not parse 13F filing {filing.accession_number}: {e}",
                    job="fetch_13f",
                )
                continue

    except Exception as e:
        log_warning(f"Could not fetch filings for CIK {cik}: {e}", job="fetch_13f")

    log(f"CIK {cik}: fetched {len(results)} holdings", job="fetch_13f")
    return results


def _safe(val):
    """Convert NaN / None to None, leave everything else as-is."""
    if val is None:
        return None
    try:
        if math.isnan(float(val)):
            return None
    except (TypeError, ValueError):
        pass
    return val


def _date_to_quarter(date_str: str) -> str:
    """Convert '2025-12-31' → '2025Q4'."""
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
        q = (d.month - 1) // 3 + 1
        return f"{d.year}Q{q}"
    except Exception:
        return date_str[:7] if date_str else "unknown"
