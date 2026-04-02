import time
import threading


class RateLimiter:
    """Thread-safe token bucket rate limiter."""

    def __init__(self, calls_per_second: float) -> None:
        self.calls_per_second = calls_per_second
        self.min_interval = 1.0 / calls_per_second
        self.last_called = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        """Block until the next call is allowed."""
        with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_called
            wait_time = self.min_interval - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            self.last_called = time.monotonic()


# Pre-configured limiters
SEC_LIMITER      = RateLimiter(9.0)   # SEC allows 10 req/s; use 9 to be safe
FINNHUB_LIMITER  = RateLimiter(30.0)  # Finnhub free tier: 30 req/s
YFINANCE_LIMITER = RateLimiter(0.5)   # ~2000/hour unofficial cap
