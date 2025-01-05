"""
Critical Path Validation
Last Updated: 2024-12-27T20:18:32+01:00
Critical Path: Validation
"""

from typing import List, Dict, Any
import asyncio
import logging
from datetime import datetime

from .hooks.validation_hooks import ValidationEvent, hook_manager
from .models import ValidationResult

logger = logging.getLogger(__name__)

class CriticalPathValidator:
    """Validates critical path components"""
    
    def __init__(self):
        self._validation_cache: Dict[str, ValidationResult] = {}
        self._validation_lock = asyncio.Lock()
    
    async def validate_critical_path(self, component: str) -> ValidationResult:
        """Validate a critical path component"""
        async with self._validation_lock:
            # Check cache first
            if component in self._validation_cache:
                result = self._validation_cache[component]
                # Return cached result if less than validation interval
                if (datetime.now() - result.timestamp).total_seconds() < 3600:
                    return result
            
            # Run validation hooks
            hook_results = await hook_manager.run_hooks(
                ValidationEvent.CRITICAL_PATH_VALIDATION,
                {'component': component}
            )
            
            # Aggregate results
            is_valid = all(result.is_valid for result in hook_results)
            messages = [result.message for result in hook_results]
            details = {
                'hook_results': [
                    {
                        'is_valid': result.is_valid,
                        'message': result.message,
                        'details': result.details
                    }
                    for result in hook_results
                ]
            }
            
            # Create result
            result = ValidationResult(
                is_valid=is_valid,
                message="\n".join(messages),
                details=details,
                timestamp=datetime.now()
            )
            
            # Cache result
            self._validation_cache[component] = result
            
            return result
    
    async def validate_all(self) -> Dict[str, ValidationResult]:
        """Validate all critical path components"""
        components = [
            "database",
            "security",
            "logging",
            "monitoring",
            "external_access"
        ]
        
        results = {}
        for component in components:
            results[component] = await self.validate_critical_path(component)
        
        return results

# Create singleton instance
critical_validator = CriticalPathValidator()
