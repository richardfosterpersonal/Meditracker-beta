"""
Unified Validation Decorator
Critical Path: VALIDATION-CORE-DECORATOR
Last Updated: 2025-01-02T13:21:22+01:00

This decorator enforces the unified validation approach across all code.
"""

import functools
import logging
from typing import Callable, Any, Dict, Optional
from pathlib import Path
from datetime import datetime

from .unified_validation_framework import UnifiedValidationFramework
from .exceptions import ValidationError

logger = logging.getLogger(__name__)

def unified_validation(
    critical_path: str,
    validation_layer: Optional[str] = None,
    skip_evidence: bool = False
):
    """
    Decorator that enforces unified validation approach.
    
    Args:
        critical_path: The critical path this function belongs to
        validation_layer: The validation layer (Domain, Application, Infrastructure, Presentation)
        skip_evidence: If True, skip evidence collection (for performance-critical paths)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            framework = UnifiedValidationFramework()
            
            try:
                # Pre-validation
                validation_result = await framework.validate_critical_path(critical_path)
                if not validation_result["valid"]:
                    raise ValidationError(
                        f"Critical path validation failed: {validation_result['error']}",
                        details=validation_result.get("details")
                    )
                    
                # If layer specified, validate layer
                if validation_layer:
                    layer_result = await framework.validate_layer(validation_layer)
                    if not layer_result["valid"]:
                        raise ValidationError(
                            f"Layer validation failed: {layer_result['error']}",
                            details=layer_result.get("details")
                        )
                        
                # Execute function
                start_time = datetime.now()
                result = await func(*args, **kwargs)
                end_time = datetime.now()
                
                # Collect evidence
                if not skip_evidence:
                    evidence = {
                        "critical_path": critical_path,
                        "validation_layer": validation_layer,
                        "function": func.__name__,
                        "execution_time": (end_time - start_time).total_seconds(),
                        "validation_result": validation_result,
                        "timestamp": end_time.isoformat()
                    }
                    
                    framework._store_validation_evidence(
                        critical_path,
                        evidence
                    )
                    
                return result
                
            except Exception as e:
                logger.error(
                    f"Unified validation failed for {func.__name__}: {str(e)}",
                    extra={
                        "critical_path": critical_path,
                        "validation_layer": validation_layer,
                        "error": str(e)
                    }
                )
                raise
                
        return wrapper
    return decorator
