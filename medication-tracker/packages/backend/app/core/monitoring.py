"""
Application Monitoring and Metrics
Last Updated: 2024-12-25T21:54:37+01:00

Critical Path: Monitoring.Core
"""
import functools
import logging
import os
import time
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, Optional, List, Set
from .constants import (
    BETA_CRITICAL_PATHS,
    BETA_REQUIRED_VALIDATIONS,
    VALIDATION_STATUSES
)
from .scope_validation import get_validation_context
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.export import ConsoleSpanExporter
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from fastapi import FastAPI

# Initialize OpenTelemetry
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Add ConsoleSpanExporter for development
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(ConsoleSpanExporter())
)

"""
Monitoring System
Last Updated: 2024-12-25T21:57:15+01:00
Critical Path: Active Monitoring
"""

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LogLevel(Enum):
    """HIPAA compliant log levels."""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    PHI_ACCESS = "PHI_ACCESS"

class HIPAACompliantLogger:
    """HIPAA compliant logging system."""
    
    def __init__(self):
        self.logs = []
        self.phi_access_counter = 0
        self.logger = logging.getLogger("HIPAA")
        
    def log(self, level: LogLevel, message: str, metadata: Optional[Dict] = None):
        """Log a HIPAA compliant message."""
        if level == LogLevel.PHI_ACCESS:
            self.phi_access_counter += 1
            
        entry = {
            'level': level.value,
            'message': message,
            'metadata': metadata or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        self.logs.append(entry)
        self.logger.info(f"HIPAA Log: {entry}")
        
    def get_logs(self) -> List[Dict[str, Any]]:
        """Get all logs."""
        return self.logs
    
    def get_phi_access_count(self) -> int:
        """Get number of PHI accesses."""
        return self.phi_access_counter

class MetricsCollector:
    """Collects and manages system metrics."""
    
    def __init__(self):
        self.metrics = {}
        self.logger = logging.getLogger("Metrics")
        
    def record_metric(self, name: str, value: Any, metadata: Optional[Dict] = None):
        """Record a metric with optional metadata."""
        metric = {
            'value': value,
            'metadata': metadata or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        self.metrics[name] = metric
        self.logger.info(f"Metric recorded: {name}={value}")
        
    def get_metric(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific metric by name."""
        return self.metrics.get(name)
        
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all recorded metrics."""
        return self.metrics
        
    def clear_metrics(self):
        """Clear all recorded metrics."""
        self.metrics = {}
        self.logger.info("All metrics cleared")

class PerformanceMonitor:
    """Monitors system performance metrics."""
    
    def __init__(self):
        self.metrics = {}
        self.start_time = datetime.utcnow()
        self.logger = logging.getLogger("Performance")
        
    def record_metric(self, name: str, value: Any):
        """Record a performance metric."""
        self.metrics[name] = {
            'value': value,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.logger.info(f"Metric recorded: {name}={value}")
        
    def get_metrics(self) -> Dict[str, Any]:
        """Get all recorded metrics."""
        return self.metrics

class SecurityMonitor:
    """Monitors security-related events."""
    
    def __init__(self):
        self.events = []
        self.logger = logging.getLogger("Security")
        
    def log_event(self, event_type: str, details: Dict[str, Any]):
        """Log a security event."""
        event = {
            'type': event_type,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.events.append(event)
        self.logger.info(f"Security event: {event}")
        
    def get_events(self) -> List[Dict[str, Any]]:
        """Get all recorded security events."""
        return self.events

class ValidationMonitor:
    """Monitors validation status.
    Critical Path: Monitoring.Validation
    """
    
    def __init__(self):
        self.validations = {}
        self.logger = logging.getLogger("Validation")
        self.validation_counter = Counter(
            'validation_total',
            'Total number of validations',
            ['component', 'status']
        )
        self.validation_duration = Histogram(
            'validation_duration_seconds',
            'Validation duration in seconds',
            ['component']
        )
        
    def record_validation(self, component: str, status: bool, details: Optional[Dict] = None):
        """Record a validation result."""
        result = {
            'status': status,
            'details': details or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        self.validations[component] = result
        self.logger.info(f"Validation: {component} - {result}")
        
        # Update metrics
        self.validation_counter.labels(
            component=component,
            status='success' if status else 'failure'
        ).inc()
        
    def start_validation(self, component: str) -> None:
        """Start timing a validation operation."""
        self.validation_duration.labels(component=component).time()
        
    def get_validations(self) -> Dict[str, Any]:
        """Get all validation results."""
        return self.validations
        
    def get_failed_validations(self) -> Dict[str, Any]:
        """Get all failed validations."""
        return {k: v for k, v in self.validations.items() if not v['status']}
        
    def has_critical_failures(self) -> bool:
        """Check if there are any critical validation failures."""
        return any(
            not v['status'] and v.get('details', {}).get('critical', True)
            for v in self.validations.values()
        )

class BetaValidationMonitor:
    """Monitors validation status of beta-critical components
    Critical Path: Monitoring.Beta
    """
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.last_check: Dict[str, datetime] = {}
        self.validation_status: Dict[str, str] = {}
        self.validation_metrics = ValidationMonitor()
        
    def check_beta_validations(self) -> Dict[str, Dict]:
        """Check validation status of all beta-critical components"""
        results = {
            'preflight': {'status': 'UNKNOWN', 'missing': []},
            'runtime': {'status': 'UNKNOWN', 'missing': []},
            'monitoring': {'status': 'UNKNOWN', 'missing': []}
        }
        
        # Check preflight validation status
        from .preflight import PreflightValidator
        preflight = PreflightValidator(self.project_root)
        self.validation_metrics.start_validation('preflight')
        passed, preflight_results = preflight.run_all_validations()
        results['preflight'] = {
            'status': 'PASSED' if passed else 'FAILED',
            'details': [r.message for r in preflight_results if not r.success]
        }
        
        # Check runtime validation status
        from .reliability import ReliabilityValidator
        reliability = ReliabilityValidator()
        self.validation_metrics.start_validation('runtime')
        runtime_results = reliability.validate_all(skip_endpoints=True)
        results['runtime'] = {
            'status': 'PASSED' if all(r.status for r in runtime_results) else 'FAILED',
            'details': [r.message for r in runtime_results if not r.status]
        }
        
        # Record validation metrics
        for component, result in results.items():
            self.validation_metrics.record_validation(
                component=component,
                status=result['status'] == 'PASSED',
                details={'messages': result.get('details', [])}
            )
            
        return results
        
    def get_beta_readiness(self) -> Dict:
        """Get beta readiness status"""
        validations = self.check_beta_validations()
        
        total_components = len(validations)
        valid_components = sum(
            1 for data in validations.values()
            if data['status'] == 'PASSED'
        )
        
        return {
            'ready_for_beta': valid_components == total_components,
            'validation_coverage': (valid_components / total_components) * 100,
            'component_status': validations,
            'last_checked': {
                component: self.last_check.get(component)
                for component in validations
            }
        }
        
    def get_missing_validations(self) -> Dict[str, List[str]]:
        """Get list of missing validations by component"""
        validations = self.check_beta_validations()
        return {
            component: data['missing']
            for component, data in validations.items()
            if data['missing']
        }
        
    def generate_validation_report(self) -> str:
        """Generate a validation status report"""
        status = self.get_beta_readiness()
        missing = self.get_missing_validations()
        
        report = [
            "# Beta Validation Status Report",
            f"Generated: {datetime.now().isoformat()}",
            "",
            f"Beta Readiness: {'READY' if status['ready_for_beta'] else 'NOT READY'}",
            f"Validation Coverage: {status['validation_coverage']:.1f}%",
            "",
            "## Component Status"
        ]
        
        for component, data in status['component_status'].items():
            report.extend([
                f"### {component}",
                f"Status: {data['status']}",
                f"Last Checked: {status['last_checked'][component].isoformat()}",
                ""
            ])
            
            if component in missing:
                report.extend([
                    "Missing Validations:",
                    *[f"- {item}" for item in missing[component]],
                    ""
                ])
                
        return "\n".join(report)

class NotificationMetrics:
    """Notification metrics collector"""
    def __init__(self):
        self.sent_counter = Counter(
            'notification_sent_total',
            'Total number of notifications sent',
            ['type']
        )
        self.failed_counter = Counter(
            'notification_failed_total',
            'Total number of failed notification attempts',
            ['type']
        )
        self.latency = Histogram(
            'notification_latency_seconds',
            'Notification sending latency in seconds',
            ['type']
        )

def monitor_performance(name: str):
    """
    Decorator to monitor function performance.
    
    Args:
        name: Name of the function to monitor
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            try:
                result = func(*args, **kwargs)
                status = "success"
            except Exception as e:
                status = "error"
                raise e
            finally:
                end_time = datetime.utcnow()
                duration = (end_time - start_time).total_seconds()
                monitor = PerformanceMonitor()
                monitor.record_metric(
                    name=name,
                    value={
                        'duration': duration,
                        'status': status,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
            return result
        return wrapper
    return decorator

# Security Metrics
class SecurityMetrics:
    """
    Security-related metrics collection
    Critical Path: Security.Monitoring
    """
    auth_attempts = Counter(
        'auth_attempts_total',
        'Total number of authentication attempts',
        ['status']
    )
    
    encryption_operations = Counter(
        'encryption_operations_total',
        'Total number of encryption operations',
        ['operation', 'status']
    )
    
    security_violations = Counter(
        'security_violations_total',
        'Total number of security violations',
        ['type']
    )
    
    active_sessions = Gauge(
        'active_sessions',
        'Number of active sessions'
    )

# Performance Metrics
request_latency = Histogram(
    'request_latency_seconds',
    'Request latency in seconds',
    ['endpoint']
)

error_count = Counter(
    'error_count_total',
    'Total number of errors',
    ['type']
)

# Monitoring Decorator
def monitor(metric: Optional[Counter] = None) -> Callable:
    """
    Monitor function execution
    Critical Path: Monitoring.Operation
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            with tracer.start_as_current_span(
                func.__name__,
                attributes={"function.name": func.__name__}
            ) as span:
                try:
                    result = await func(*args, **kwargs)
                    if metric:
                        metric.labels(status="success").inc()
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    if metric:
                        metric.labels(status="error").inc()
                    error_count.labels(type=type(e).__name__).inc()
                    span.set_status(Status(StatusCode.ERROR))
                    span.record_exception(e)
                    raise
        return wrapper
    return decorator

# Performance Tracking
def track_timing(endpoint: str) -> Callable:
    """
    Track endpoint timing
    Critical Path: Monitoring.Performance
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            with tracer.start_as_current_span(
                f"endpoint_{endpoint}",
                attributes={"endpoint": endpoint}
            ) as span:
                try:
                    start_time = datetime.utcnow()
                    result = await func(*args, **kwargs)
                    duration = (datetime.utcnow() - start_time).total_seconds()
                    request_latency.labels(endpoint=endpoint).observe(duration)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR))
                    span.record_exception(e)
                    raise
        return wrapper
    return decorator

# Error Logging
def log_error(error: Exception, context: Dict[str, Any]) -> None:
    """
    Log error with context
    Critical Path: Monitoring.Error
    """
    with tracer.start_as_current_span(
        "error_logging",
        attributes={"error.type": type(error).__name__}
    ) as span:
        error_count.labels(type=type(error).__name__).inc()
        logging.error(
            f"Error: {str(error)}, Context: {context}",
            extra={"error_type": type(error).__name__}
        )
        span.set_status(Status(StatusCode.ERROR))
        span.record_exception(error)

"""
Monitoring Module
Critical Path: MONITORING
Last Updated: 2025-01-02T16:08:17+01:00
"""

import logging
import functools
import time
from typing import Any, Callable, Dict, Optional
from fastapi import FastAPI

from .config import config

logger = logging.getLogger(__name__)

def setup_monitoring(app: FastAPI) -> None:
    """Set up application monitoring"""
    if not config.get_bool("features.monitoring.enabled"):
        logger.warning("Monitoring is disabled")
        return
        
    logger.info("Setting up application monitoring")
    
    @app.middleware("http")
    async def monitor_requests(request: Any, call_next: Callable) -> Any:
        """Monitor HTTP requests"""
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log request metrics
        logger.info(
            "Request processed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration": duration,
                "status_code": response.status_code
            }
        )
        
        return response
        
    logger.info("Application monitoring configured")

def track_timing(func: Callable) -> Callable:
    """Decorator to track function execution time"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start_time
        
        # Log function metrics
        logger.info(
            f"Function {func.__name__} executed",
            extra={
                "function": func.__name__,
                "duration": duration
            }
        )
        
        return result
    return wrapper

def log_error(error_message: str, error: Optional[Exception] = None) -> None:
    """Log error with context"""
    logger.error(
        error_message,
        exc_info=error,
        extra={
            "context": getattr(error, "context", {}),
            "error_type": type(error).__name__ if error else None
        }
    )
