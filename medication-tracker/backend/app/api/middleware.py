from datetime import datetime
import time
from typing import Callable
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        return response

def setup_middleware(app: FastAPI) -> None:
    """Setup all middleware for the application"""
    
    # CORS middleware must be first
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # Frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Trusted Host middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1"]
    )

    # Gzip compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(429, _rate_limit_exceeded_handler)

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next: Callable) -> Response:
        start_time = datetime.now()
        try:
            response = await call_next(request)
            
            # Log request details
            log_data = {
                "timestamp": start_time.isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": (datetime.now() - start_time).total_seconds() * 1000
            }
            
            # Only add client IP if available
            if request.client and hasattr(request.client, 'host'):
                log_data["client_ip"] = request.client.host
            
            logger.info(f"Request processed: {log_data}")
            return response
            
        except Exception as e:
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
            raise

    # Error handling middleware
    @app.middleware("http")
    async def catch_exceptions(request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
            
            # Return a generic error response
            return Response(
                content="Internal server error",
                status_code=500,
                media_type="text/plain"
            )
