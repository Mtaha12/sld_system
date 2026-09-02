import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        bucket = self._requests[key]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            return False

        bucket.append(now)
        return True

    def reset(self) -> None:
        self._requests.clear()


rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        if not request.url.path.startswith(settings.API_V1_STR):
            return await call_next(request)

        api_key = request.headers.get("x-api-key")
        client_host = request.client.host if request.client else "unknown"
        principal = api_key[-8:] if api_key else client_host

        limit = settings.RATE_LIMIT_REQUESTS
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        if request.url.path.startswith(f"{settings.API_V1_STR}/chat"):
            limit = settings.CHAT_RATE_LIMIT_REQUESTS
            window = settings.CHAT_RATE_LIMIT_WINDOW_SECONDS

        key = f"{principal}:{request.url.path}"
        if not rate_limiter.allow(key, limit, window):
            return Response(
                content='{"detail":"Rate limit exceeded."}',
                media_type="application/json",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
