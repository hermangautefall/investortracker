from pydantic import ValidationError

from core.logger import log_warning
from core.validator import CongressTrade, InsiderTrade


def normalize_congress_row(raw: dict, job: str = "normalize") -> CongressTrade | None:
    """
    Validate a raw congressional trade row against the CongressTrade model.
    Returns None (and logs a warning) if validation fails.
    A single bad row must never raise – it is silently skipped.
    """
    try:
        return CongressTrade(**raw)
    except ValidationError as e:
        log_warning(
            f"Skipping invalid congress row: {e.errors()[0]['msg']} | {raw}",
            job=job,
        )
        return None
    except Exception as e:
        log_warning(f"Skipping congress row (unexpected error): {e} | {raw}", job=job)
        return None


def normalize_form4_row(raw: dict, job: str = "normalize") -> InsiderTrade | None:
    """
    Validate a raw Form 4 row against the InsiderTrade model.
    Returns None (and logs a warning) if validation fails.
    """
    try:
        return InsiderTrade(**raw)
    except ValidationError as e:
        log_warning(
            f"Skipping invalid Form 4 row: {e.errors()[0]['msg']} | {raw}",
            job=job,
        )
        return None
    except Exception as e:
        log_warning(f"Skipping Form 4 row (unexpected error): {e} | {raw}", job=job)
        return None
