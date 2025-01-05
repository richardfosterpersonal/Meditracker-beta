"""Rate limiting middleware for API protection."""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from ..core.config import get_settings
from ..services.cache_service import cache_service
from .audit_logger import AuditLogger

audit_logger = AuditLogger(__name__)

class RateLimiter(BaseHTTPMiddleware):
    """Rate limiting middleware for protecting API endpoints."""

    def __init__(self, app):
        """Initialize rate limiter."""
        super().__init__(app)
        self.settings = get_settings()
        self.cache = cache_service
        self._setup_rate_limits()

    def _setup_rate_limits(self) -> None:
        """Setup rate limit configurations for different endpoints."""
        self.rate_limits = {
            # Authentication endpoints
            "POST:/api/v1/auth/login": (20, 300),  # 20 requests per 5 minutes
            "POST:/api/v1/auth/register": (10, 3600),  # 10 requests per hour
            
            # Medication management
            "GET:/api/v1/medications": (100, 60),  # 100 requests per minute
            "POST:/api/v1/medications": (50, 60),  # 50 requests per minute
            "PUT:/api/v1/medications": (50, 60),  # 50 requests per minute
            "DELETE:/api/v1/medications": (20, 60),  # 20 requests per minute
            
            # Emergency endpoints - higher limits
            "GET:/api/v1/emergency": (200, 60),  # 200 requests per minute
            "POST:/api/v1/emergency": (100, 60),  # 100 requests per minute
            
            # Default rate limit for all other endpoints
            "*": (50, 60)  # 50 requests per minute
        }

    def _get_rate_limit(self, method: str, path: str) -> Tuple[int, int]:
        """Get rate limit for endpoint."""
        endpoint = f"{method}:{path}"
        return self.rate_limits.get(endpoint, self.rate_limits["*"])

    def _get_cache_key(self, request: Request) -> str:
        """Generate cache key for rate limiting."""
        client_ip = request.client.host
        endpoint = f"{request.method}:{request.url.path}"
        return f"ratelimit:{client_ip}:{endpoint}"

    async def _check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if request is within rate limit."""
        try:
            current_count = self.cache.get(key) or 0
            
            if current_count >= limit:
                return False
            
            # Increment counter
            new_count = current_count + 1
            self.cache.set(key, new_count, duration=timedelta(seconds=window))
            
            return True
        except Exception as e:
            audit_logger.error(
                "rate_limit_check_error",
                {"error": str(e)}
            )
            # Fail open to prevent blocking legitimate traffic
            return True

    async def dispatch(self, request: Request, call_next):
        """Handle incoming request and apply rate limiting."""
        try:
            # Skip rate limiting for health check endpoint
            if request.url.path == "/health":
                return await call_next(request)

            # Get rate limit for endpoint
            limit, window = self._get_rate_limit(request.method, request.url.path)
            cache_key = self._get_cache_key(request)

            # Check rate limit
            if not await self._check_rate_limit(cache_key, limit, window):
                audit_logger.warning(
                    "rate_limit_exceeded",
                    {
                        "ip": request.client.host,
                        "endpoint": f"{request.method}:{request.url.path}"
                    }
                )
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later."
                )

            # Process request
            response = await call_next(request)
            return response

        except HTTPException:
            raise
        except Exception as e:
            audit_logger.error(
                "rate_limiter_error",
                {"error": str(e)}
            )
            raise HTTPException(
                status_code=500,
                detail="Internal server error in rate limiter."
            )
