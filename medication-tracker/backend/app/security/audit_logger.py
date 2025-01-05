"""Audit logging for security events."""

import logging
import json
from datetime import datetime
from typing import Any, Dict, Optional
import hashlib
from functools import wraps
import os
from pathlib import Path

from ..core.config import get_settings

class AuditLogger:
    """Logger for security and audit events."""

    def __init__(self, module_name: str):
        """Initialize the audit logger."""
        self.settings = get_settings()
        self.logger = logging.getLogger(f"audit.{module_name}")
        self._setup_logger()

    def _setup_logger(self) -> None:
        """Setup logger with appropriate handlers and formatters."""
        # Ensure log directory exists
        log_path = Path(self.settings.AUDIT_LOG_PATH)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create a file handler
        handler = logging.FileHandler(
            str(log_path),
            encoding='utf-8'
        )
        
        # Create a formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        
        # Add handler to logger
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def _format_log_entry(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> str:
        """Format log entry with consistent structure."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "data": data
        }

        # Add hash for integrity verification
        log_entry["hash"] = self._generate_entry_hash(log_entry)
        
        return json.dumps(log_entry)

    def _generate_entry_hash(self, entry: Dict[str, Any]) -> str:
        """Generate hash for log entry to ensure integrity."""
        # Create a deterministic string representation
        entry_str = json.dumps(entry, sort_keys=True)
        
        # Generate hash using SHA-256
        return hashlib.sha256(
            entry_str.encode('utf-8')
        ).hexdigest()

    def info(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> None:
        """Log an informational audit event."""
        log_entry = self._format_log_entry(event_type, data, user_id)
        self.logger.info(log_entry)

    def warning(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> None:
        """Log a warning audit event."""
        log_entry = self._format_log_entry(event_type, data, user_id)
        self.logger.warning(log_entry)

    def error(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> None:
        """Log an error audit event."""
        log_entry = self._format_log_entry(event_type, data, user_id)
        self.logger.error(log_entry)

    def security_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> None:
        """Log a security-specific event."""
        data["security_level"] = "high"
        log_entry = self._format_log_entry(f"security_{event_type}", data, user_id)
        self.logger.warning(log_entry)

def audit_log(event_type: str):
    """Decorator for automatic audit logging of function calls."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get the audit logger
            logger = AuditLogger(func.__module__)
            
            try:
                # Log the function call
                logger.info(
                    f"{event_type}_start",
                    {
                        "function": func.__name__,
                        "args": str(args),
                        "kwargs": str(kwargs)
                    }
                )
                
                # Execute the function
                result = func(*args, **kwargs)
                
                # Log successful completion
                logger.info(
                    f"{event_type}_complete",
                    {
                        "function": func.__name__,
                        "status": "success"
                    }
                )
                
                return result
                
            except Exception as e:
                # Log the error
                logger.error(
                    f"{event_type}_error",
                    {
                        "function": func.__name__,
                        "error": str(e)
                    }
                )
                raise
                
        return wrapper
    return decorator
