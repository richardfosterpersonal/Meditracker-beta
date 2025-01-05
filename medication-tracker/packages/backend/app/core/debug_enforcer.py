"""
Debug Enforcement System
Critical Path: DEBUG-ENF-*
Last Updated: 2025-01-01T23:00:44+01:00

This module provides decorators to enforce proactive debugging practices.
"""

import functools
import inspect
import logging
from typing import Any, Callable, Dict, Optional

from .debug_validation import DebugEnforcer

logger = logging.getLogger(__name__)

def enforce_debug_practices(critical: bool = False):
    """
    Decorator to enforce debug practices
    
    Args:
        critical: If True, raises exception when debug practices aren't followed
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function metadata
            module = inspect.getmodule(func)
            filename = inspect.getfile(func)
            lineno = inspect.getsourcelines(func)[1]
            
            # Log function entry with context
            logger.info(
                f"Entering {func.__name__} at {filename}:{lineno}",
                extra={
                    "function": func.__name__,
                    "module": module.__name__,
                    "filename": filename,
                    "lineno": lineno,
                    "args": args,
                    "kwargs": kwargs
                }
            )
            
            try:
                # Apply debug enforcement decorators
                wrapped = DebugEnforcer.validate_error_handling(
                    DebugEnforcer.enforce_root_cause_analysis(func)
                )
                result = wrapped(*args, **kwargs)
                
                # Log successful execution
                logger.info(
                    f"Successfully executed {func.__name__}",
                    extra={"result": result}
                )
                
                return result
                
            except Exception as e:
                logger.error(
                    f"Error in {func.__name__}: {str(e)}",
                    exc_info=True,
                    extra={
                        "function": func.__name__,
                        "module": module.__name__,
                        "filename": filename,
                        "lineno": lineno
                    }
                )
                if critical:
                    raise
                return None
                
        return wrapper
    return decorator

def debug_critical_path(path: str):
    """
    Decorator to mark and validate critical path functions
    
    Args:
        path: Critical path identifier (e.g., 'DEBUG-CORE-*')
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function metadata
            module = inspect.getmodule(func)
            filename = inspect.getfile(func)
            
            # Log critical path entry
            logger.info(
                f"Entering critical path {path} in {func.__name__}",
                extra={
                    "critical_path": path,
                    "function": func.__name__,
                    "module": module.__name__,
                    "filename": filename
                }
            )
            
            try:
                # Apply debug enforcement
                wrapped = enforce_debug_practices(critical=True)(func)
                return wrapped(*args, **kwargs)
                
            except Exception as e:
                logger.error(
                    f"Critical path {path} failed in {func.__name__}: {str(e)}",
                    exc_info=True
                )
                raise
                
        return wrapper
    return decorator
