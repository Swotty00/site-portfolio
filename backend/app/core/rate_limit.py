"""Small in-memory sliding-window rate limiter exposed as a FastAPI dependency.

State is per-process. That is adequate for a single-container deployment; behind several
replicas, enforce limits at the reverse proxy (see docker/nginx.conf) or swap the store
for Redis.
"""

from __future__ import annotations

import math
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import get_settings

_MAX_TRACKED_KEYS = 10_000


class RateLimiter:
    _instances: list[RateLimiter] = []

    def __init__(self, scope: str, limit: Callable[[], int], window_seconds: int = 60) -> None:
        self.scope = scope
        self._limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        RateLimiter._instances.append(self)

    def __call__(self, request: Request) -> None:
        if not get_settings().rate_limit_enabled:
            return
        client = request.client.host if request.client else "unknown"
        retry_after = self._hit(client)
        if retry_after is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down.",
                headers={"Retry-After": str(retry_after)},
            )

    def _hit(self, key: str) -> int | None:
        """Record a hit; return seconds to wait if the caller is over the limit."""
        now = time.monotonic()
        limit = self._limit()
        with self._lock:
            if len(self._hits) > _MAX_TRACKED_KEYS:
                self._prune(now)
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= limit:
                return max(1, math.ceil(self.window - (now - hits[0])))
            hits.append(now)
        return None

    def _prune(self, now: float) -> None:
        for key in [k for k, v in self._hits.items() if not v or now - v[-1] >= self.window]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    @classmethod
    def reset_all(cls) -> None:
        for instance in cls._instances:
            instance.reset()


default_limiter = RateLimiter("default", lambda: get_settings().rate_limit_default)
login_limiter = RateLimiter("login", lambda: get_settings().rate_limit_login)
refresh_limiter = RateLimiter("refresh", lambda: get_settings().rate_limit_refresh)
pdf_limiter = RateLimiter("pdf", lambda: get_settings().rate_limit_pdf)
