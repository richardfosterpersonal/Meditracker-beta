import logging
import json
import time
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, g
import structlog
from prometheus_client import Counter, Histogram

# Metrics
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint']
)

ERROR_COUNTER = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['method', 'endpoint', 'status']
)

class BetaLogger:
    def __init__(self):
        structlog.configure(
            processors=[
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            wrapper_class=structlog.BoundLogger,
            cache_logger_on_first_use=True,
        )
        
        self.logger = structlog.get_logger()

    def log_request(self, response):
        """Log HTTP request details"""
        request_duration = time.time() - g.start_time
        
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.endpoint
        ).observe(request_duration)

        if response.status_code >= 400:
            ERROR_COUNTER.labels(
                method=request.method,
                endpoint=request.endpoint,
                status=response.status_code
            ).inc()

        self.logger.info(
            "http_request",
            method=request.method,
            path=request.path,
            status_code=response.status_code,
            duration=request_duration,
            user_id=getattr(g, 'user_id', None),
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )

    def log_error(self, error: Exception, context: Optional[Dict[str, Any]] = None):
        """Log application errors"""
        self.logger.error(
            "application_error",
            error_type=type(error).__name__,
            error_message=str(error),
            context=context or {},
            user_id=getattr(g, 'user_id', None),
            endpoint=request.endpoint if request else None
        )

    def log_beta_feedback(self, feedback_data: Dict[str, Any]):
        """Log beta user feedback"""
        self.logger.info(
            "beta_feedback",
            user_id=feedback_data.get('user_id'),
            feedback_type=feedback_data.get('type'),
            feedback_content=feedback_data.get('content'),
            rating=feedback_data.get('rating'),
            feature=feedback_data.get('feature')
        )

    def log_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Log application metrics"""
        self.logger.info(
            "application_metric",
            metric_name=metric_name,
            value=value,
            tags=tags or {}
        )

def beta_logging_middleware():
    """Middleware to handle request logging"""
    def middleware(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            g.start_time = time.time()
            response = f(*args, **kwargs)
            beta_logger.log_request(response)
            return response
        return decorated_function
    return middleware

# Initialize global logger instance
beta_logger = BetaLogger()
