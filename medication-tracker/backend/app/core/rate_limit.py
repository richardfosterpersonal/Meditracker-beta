from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.core.audit import audit_logger, AuditEventType

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Custom rate limit exceeded handler
def on_rate_limit_exceeded(request_limit):
    """Handler for rate limit exceeded events"""
    audit_logger.log_security_event(
        action="rate_limit_exceeded",
        status="blocked",
        details={
            "ip_address": get_remote_address(),
            "path": request.path,
            "limit": str(request_limit)
        }
    )

# Define specific rate limits for sensitive endpoints
auth_limit = ["5 per minute", "100 per hour"]
api_limit = ["30 per minute", "1000 per hour"]

def init_rate_limiting(app):
    """Initialize rate limiting for the application"""
    limiter.init_app(app)
    limiter.on_breach(on_rate_limit_exceeded)
    
    # Register specific limits
    limiter.limit(auth_limit)(app.view_functions['auth.login'])
    limiter.limit(auth_limit)(app.view_functions['auth.register'])
    
    return limiter
