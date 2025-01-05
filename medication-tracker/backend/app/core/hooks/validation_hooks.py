"""
Validation Hook System
Last Updated: 2025-01-01T21:34:27+01:00
Critical Path: Validation Hooks
"""

from enum import Enum
from typing import Dict, List, Any, Callable, Awaitable
import logging
import asyncio
from datetime import datetime

from ..models import ValidationResult

logger = logging.getLogger(__name__)

class ValidationEvent(str, Enum):
    """Validation event types"""
    PRE_VALIDATION = "pre_validation"
    CRITICAL_PATH_VALIDATION = "critical_path_validation"
    BETA_VALIDATION = "beta_validation"
    PRE_REQUEST = "pre_request"
    CONFIG_CHANGE = "config_change"
    DATABASE_MIGRATION = "database_migration"

ValidationHook = Callable[[Dict[str, Any]], Awaitable[ValidationResult]]

class ValidationHookManager:
    """Manages validation hooks across the application"""
    
    def __init__(self):
        self._hooks: Dict[ValidationEvent, List[ValidationHook]] = {
            event: [] for event in ValidationEvent
        }
        self._hook_lock = asyncio.Lock()
        self._validation_order = [
            ValidationEvent.PRE_VALIDATION,
            ValidationEvent.CRITICAL_PATH_VALIDATION,
            ValidationEvent.BETA_VALIDATION,
            ValidationEvent.PRE_REQUEST,
            ValidationEvent.CONFIG_CHANGE,
            ValidationEvent.DATABASE_MIGRATION
        ]
        
    def register_hook(self, event: ValidationEvent, hook: ValidationHook):
        """Register a validation hook for an event"""
        if event not in self._hooks:
            raise ValueError(f"Invalid validation event: {event}")
        
        self._hooks[event].append(hook)
        logger.info(f"Registered hook for event: {event}")
        
    async def run_hooks(self, event: ValidationEvent, context: Dict[str, Any]) -> List[ValidationResult]:
        """Run all hooks for an event"""
        if event not in self._hooks:
            raise ValueError(f"Invalid validation event: {event}")
            
        # If this isn't a pre-validation event, ensure pre-validation has run
        if event != ValidationEvent.PRE_VALIDATION:
            pre_validation_results = await self.run_hooks(
                ValidationEvent.PRE_VALIDATION,
                context
            )
            if not all(result.success for result in pre_validation_results):
                raise ValueError("Pre-validation must pass before running other validations")
        
        async with self._hook_lock:
            results = []
            for hook in self._hooks[event]:
                try:
                    result = await hook(context)
                    results.append(result)
                    if not result.success and result.blocking:
                        break
                except Exception as e:
                    logger.error(f"Hook failed for event {event}: {str(e)}")
                    results.append(ValidationResult(
                        success=False,
                        message=f"Hook failed: {str(e)}",
                        blocking=True
                    ))
                    break
            return results
            
    async def run_all_validations(self, context: Dict[str, Any]) -> Dict[ValidationEvent, List[ValidationResult]]:
        """Run all validations in the correct order"""
        results = {}
        for event in self._validation_order:
            try:
                event_results = await self.run_hooks(event, context)
                results[event] = event_results
                if not all(result.success for result in event_results):
                    break
            except Exception as e:
                logger.error(f"Validation failed for event {event}: {str(e)}")
                results[event] = [ValidationResult(
                    success=False,
                    message=f"Validation failed: {str(e)}",
                    blocking=True
                )]
                break
        return results

    def clear_hooks(self, event: ValidationEvent = None):
        """Clear hooks for an event or all events"""
        if event:
            if event not in self._hooks:
                raise ValueError(f"Invalid validation event: {event}")
            self._hooks[event] = []
        else:
            self._hooks = {event: [] for event in ValidationEvent}

# Create singleton instance
hook_manager = ValidationHookManager()
