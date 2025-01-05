from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from typing import Dict, Tuple, Set, Optional
import redis
from app.core.config import settings

class RateLimitExceeded(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )

class RateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: redis.Redis):
        super().__init__(app)
        self.redis_client = redis_client
        self.rate_limits = {
            "default": (100, 60, 120),  # 100 requests per minute, burst of 120
            "/api/medications": (50, 60, 60),  # 50 requests per minute, burst of 60
            "/api/auth": (20, 60, 30),  # 20 requests per minute, burst of 30
        }
        # IP-based rate limits (requests_per_hour, max_burst)
        self.ip_rate_limits = {
            "default": (1000, 1200),  # 1000 requests per hour, burst of 1200
        }
        self.whitelist: Set[str] = set()  # Whitelisted IPs
        self.blacklist: Set[str] = set()  # Blacklisted IPs

    def add_to_whitelist(self, ip: str) -> None:
        """Add an IP to the whitelist."""
        self.whitelist.add(ip)
        if ip in self.blacklist:
            self.blacklist.remove(ip)

    def add_to_blacklist(self, ip: str) -> None:
        """Add an IP to the blacklist."""
        self.blacklist.add(ip)
        if ip in self.whitelist:
            self.whitelist.remove(ip)

    async def check_ip_based_limit(self, ip: str) -> Optional[bool]:
        """Check IP-based rate limit."""
        if ip in self.whitelist:
            return True
        if ip in self.blacklist:
            raise HTTPException(status_code=403, detail="IP address blocked")

        key = f"ip_rate_limit:{ip}"
        requests_per_hour, burst = self.ip_rate_limits["default"]
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                self.redis_client.setex(key, 3600, 1)  # 1 hour window
            else:
                current = int(current)
                if current >= requests_per_hour:
                    # Check if burst limit is exceeded
                    burst_key = f"ip_burst:{ip}"
                    burst_count = int(self.redis_client.get(burst_key) or 0)
                    if burst_count >= burst - requests_per_hour:
                        return False
                    # Allow burst but track it
                    self.redis_client.incr(burst_key)
                    if not self.redis_client.ttl(burst_key):
                        self.redis_client.expire(burst_key, 3600)
                self.redis_client.incr(key)
        except redis.RedisError:
            # If Redis is unavailable, allow the request
            return True
        
        return True

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for certain endpoints
        if request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host
        
        try:
            # Check IP-based rate limit first
            if not await self.check_ip_based_limit(client_ip):
                raise RateLimitExceeded()

            # Get endpoint-specific rate limit or default
            path = request.url.path
            max_requests, window, burst = self.get_rate_limit(path)
            
            # Create Redis key
            key = f"rate_limit:{client_ip}:{path}"
            burst_key = f"burst:{client_ip}:{path}"
            
            # Check rate limit
            current = self.redis_client.get(key)
            if current is None:
                self.redis_client.setex(key, window, 1)
            else:
                current = int(current)
                if current >= max_requests:
                    # Check burst limit
                    burst_count = int(self.redis_client.get(burst_key) or 0)
                    if burst_count >= burst - max_requests:
                        raise RateLimitExceeded()
                    # Allow burst but track it
                    self.redis_client.incr(burst_key)
                    if not self.redis_client.ttl(burst_key):
                        self.redis_client.expire(burst_key, window)
                self.redis_client.incr(key)
            
            # Add rate limit headers
            response = await call_next(request)
            remaining = max_requests - (int(self.redis_client.get(key) or 0))
            reset = self.redis_client.ttl(key)
            
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
            response.headers["X-RateLimit-Reset"] = str(reset)
            response.headers["X-RateLimit-Burst-Remaining"] = str(
                burst - int(self.redis_client.get(burst_key) or 0)
            )
            
            return response
            
        except redis.RedisError:
            # If Redis is unavailable, log error and continue without rate limiting
            return await call_next(request)
        except RateLimitExceeded as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )

    def get_rate_limit(self, path: str) -> Tuple[int, int, int]:
        """Get the rate limit for a specific path."""
        for endpoint, limit in self.rate_limits.items():
            if path.startswith(endpoint):
                return limit
        return self.rate_limits["default"]
