"""Small in-memory sliding-window rate limiter used as a FastAPI dependency."""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import TooManyRequests

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        if not get_settings().rate_limit_enabled:
            return
        key = f"{scope}:{client_ip(request)}"
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and now - q[0] > window_seconds:
                q.popleft()
            if len(q) >= limit:
                retry = max(1, int(window_seconds - (now - q[0])))
                raise TooManyRequests("Too many requests. Please slow down and try again shortly.",
                                      headers={"Retry-After": str(retry)})
            q.append(now)

    return dependency


def reset_rate_limits() -> None:
    with _lock:
        _hits.clear()
