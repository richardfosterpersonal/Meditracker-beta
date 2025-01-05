"""Security middleware for the FastAPI application."""

from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Dict, Optional
import time
import logging
from .security_config import (
    RATE_LIMIT_CONFIG,
    SECURITY_HEADERS,
    API_SECURITY,
    AUDIT_CONFIG
)

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware for implementing security measures."""
    
    def __init__(
        self,
        app,
        redis_client=None,
        audit_logger=None
    ):
        super().__init__(app)
        self.redis_client = redis_client
        self.audit_logger = audit_logger or logger

    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Process the request through security checks."""
        start_time = time.time()
        
        try:
            # Check if HTTPS is required
            if API_SECURITY["REQUIRE_HTTPS"]:
                if request.url.scheme != "https":
                    return Response(
                        content="HTTPS is required",
                        status_code=403
                    )

            # Check allowed hosts
            if request.headers.get("host") not in API_SECURITY["ALLOWED_HOSTS"]:
                return Response(
                    content="Invalid host",
                    status_code=403
                )

            # Rate limiting
            if RATE_LIMIT_CONFIG["ENABLED"]:
                if not await self._check_rate_limit(request):
                    return Response(
                        content="Rate limit exceeded",
                        status_code=429
                    )

            # Process request
            response = await call_next(request)

            # Add security headers
            self._add_security_headers(response)

            # Audit logging
            if AUDIT_CONFIG["ENABLED"]:
                self._audit_log(request, response, start_time)

            return response

        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            return Response(
                content="Internal server error",
                status_code=500
            )

    async def _check_rate_limit(self, request: Request) -> bool:
        """Check if request is within rate limits."""
        if not self.redis_client:
            return True

        # Get appropriate rate limit based on endpoint
        rate_limit = self._get_rate_limit(request)
        if not rate_limit:
            return True

        # Create rate limit key
        key = f"rate_limit:{request.client.host}:{request.url.path}"
        
        # Check current count
        count = await self.redis_client.incr(key)
        if count == 1:
            await self.redis_client.expire(key, 3600)  # 1 hour expiry

        return count <= rate_limit

    def _get_rate_limit(self, request: Request) -> Optional[int]:
        """Get rate limit for the request."""
        path = request.url.path
        method = request.method

        if "/login" in path:
            limit_str = RATE_LIMIT_CONFIG["LOGIN"]
        elif "/register" in path:
            limit_str = RATE_LIMIT_CONFIG["REGISTER"]
        else:
            limit_str = RATE_LIMIT_CONFIG["DEFAULT"]

        # Parse rate limit string (e.g., "100/hour")
        limit = int(limit_str.split("/")[0])
        return limit

    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response."""
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value

    def _audit_log(
        self,
        request: Request,
        response: Response,
        start_time: float
    ) -> None:
        """Log audit information."""
        # Skip excluded paths
        if request.url.path in AUDIT_CONFIG["EXCLUDE_PATHS"]:
            return

        # Prepare headers for logging
        headers = {}
        for header in AUDIT_CONFIG["INCLUDE_HEADERS"]:
            if header in request.headers:
                headers[header] = request.headers[header]

        # Calculate response time
        response_time = time.time() - start_time

        # Create audit log entry
        log_entry = {
            "timestamp": time.time(),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "client_ip": request.client.host,
            "headers": headers,
            "response_time": response_time
        }

        # Log at appropriate level
        log_level = getattr(logging, AUDIT_CONFIG["LOG_LEVEL"])
        self.audit_logger.log(log_level, "Audit log entry", extra=log_entry)
