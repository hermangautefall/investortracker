from datetime import date
from typing import Literal

from pydantic import BaseModel, field_validator


class CongressTrade(BaseModel):
    politician_name: str
    chamber: Literal["house", "senate"]
    party: str | None = None
    state: str | None = None
    ticker: str | None = None
    company_name: str | None = None
    trade_type: Literal["buy", "sell", "exchange"]
    amount_min: int | None = None
    amount_max: int | None = None
    trade_date: date
    disclosure_date: date
    filing_url: str | None = None
    source: str

    @field_validator("ticker", mode="before")
    @classmethod
    def clean_ticker(cls, v: str | None) -> str | None:
        """Strip whitespace and reject placeholder values."""
        if not v or v.strip() in ("--", "", "N/A"):
            return None
        return v.upper().strip()

    @field_validator("trade_type", mode="before")
    @classmethod
    def normalize_trade_type(cls, v: str) -> str:
        """Normalize free-text trade type to canonical values."""
        v = v.lower().strip()
        if any(w in v for w in ("purchase", "buy")):
            return "buy"
        if any(w in v for w in ("sale", "sell")):
            return "sell"
        return "exchange"

    @field_validator("politician_name", mode="before")
    @classmethod
    def clean_name(cls, v: str) -> str:
        """Strip leading/trailing whitespace from name."""
        return v.strip()


class InsiderTrade(BaseModel):
    insider_name: str
    cik: str
    ticker: str
    company_name: str | None = None
    trade_type: Literal["buy", "sell", "option_exercise"]
    shares: int | None = None
    price_per_share: float | None = None
    total_value: float | None = None
    trade_date: date
    filing_date: date
    form4_url: str | None = None

    @field_validator("total_value", mode="before")
    @classmethod
    def check_realistic_value(cls, v: float | None) -> float | None:
        """Reject unrealistically large values that indicate data errors."""
        if v is not None and v > 10_000_000_000:
            raise ValueError(f"Unrealistic total_value: {v} – likely a data error")
        return v

    @field_validator("ticker", mode="before")
    @classmethod
    def clean_ticker(cls, v: str) -> str:
        """Normalize ticker to uppercase."""
        return v.upper().strip()
