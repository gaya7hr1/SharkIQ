import threading
import time

from app.core.config import settings


class MinIntervalLimiter:
    """Process-wide gate enforcing a minimum spacing between calls to a shared
    external API budget (e.g. Groq's per-minute token cap).

    Thread-safe so it can be used directly from CrewAI's sync execution thread
    and via `asyncio.to_thread` from async LangChain call sites — both draw
    against the same Groq account, so they must share one gate.
    """

    def __init__(self, min_interval_seconds: float):
        self._min_interval = min_interval_seconds
        self._lock = threading.Lock()
        self._last_call = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_call
            if elapsed < self._min_interval:
                time.sleep(self._min_interval - elapsed)
            self._last_call = time.monotonic()


groq_rate_limiter = MinIntervalLimiter(settings.groq_min_request_interval_seconds)
