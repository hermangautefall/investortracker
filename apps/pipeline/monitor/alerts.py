import os
from datetime import datetime

import requests

from core.logger import log_error


def send_alert(
    job_name: str,
    error: str,
    rows_processed: int = 0,
) -> None:
    """
    Send a Telegram alert on pipeline failure.
    Never raises – a broken alert must not crash the pipeline.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        log_error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set – skipping alert")
        return
    message = (
        f"❌ *Pipeline Failure*\n"
        f"Job: `{job_name}`\n"
        f"Error: `{error[:200]}`\n"
        f"Rows processed: {rows_processed}\n"
        f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    )
    try:
        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
            timeout=10,
        )
    except Exception as e:
        log_error(f"Failed to send Telegram alert: {e}")
