from datetime import datetime


def log(message: str, level: str = "INFO", job: str | None = None) -> None:
    """Log a message with timestamp, level, and optional job name."""
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    job_part = f" [{job}]" if job else ""
    print(f"[{timestamp}] [{level}]{job_part} {message}", flush=True)


def log_error(message: str, job: str | None = None) -> None:
    """Log an ERROR-level message."""
    log(message, level="ERROR", job=job)


def log_warning(message: str, job: str | None = None) -> None:
    """Log a WARN-level message."""
    log(message, level="WARN", job=job)
