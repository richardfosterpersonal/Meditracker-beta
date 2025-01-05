"""
Validation Hook
Manages validation hooks and callbacks
Last Updated: 2025-01-02T14:05:41+01:00
"""

from typing import Dict, List, Optional, Callable
from datetime import datetime
import logging
from pathlib import Path
from enum import Enum

from .beta_settings import BetaSettings
from .validation_hooks import ValidationStage, ValidationHookPriority
from .unified_validation_framework import UnifiedValidationFramework

class ValidationHook:
    """
    Manages validation hooks and callbacks
    Handles validation event processing
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        self.hooks = {}
        self.unified_framework = UnifiedValidationFramework()
        
    def register_hook(
        self,
        phase_id: str,
        component: str,
        callback: Callable,
        priority: ValidationHookPriority = ValidationHookPriority.MEDIUM
    ) -> str:
        """Register a validation hook"""
        try:
            # Generate hook ID
            hook_id = f"HOOK-{phase_id}-{component}-{datetime.utcnow().timestamp()}"
            
            # Store callback
            self.hooks[hook_id] = {
                "phase_id": phase_id,
                "component": component,
                "callback": callback,
                "priority": priority,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Register with unified framework
            self.unified_framework.hooks.register_hook(
                hook_id=hook_id,
                stage=ValidationStage.VALIDATION,
                rules={
                    "phase_id": phase_id,
                    "component": component,
                    "priority": priority.value
                }
            )
            
            return hook_id
            
        except Exception as e:
            self.logger.error(f"Failed to register hook: {str(e)}")
            raise
            
    def run_hook(self, hook_id: str, context: Dict) -> None:
        """Run a validation hook"""
        try:
            if hook_id not in self.hooks:
                raise ValueError(f"Hook {hook_id} not found")
                
            hook = self.hooks[hook_id]
            
            # Run through unified framework
            self.unified_framework.validate({
                **context,
                "hook_id": hook_id,
                "phase_id": hook["phase_id"],
                "component": hook["component"]
            })
            
            # Run legacy callback if exists
            if hook["callback"]:
                hook["callback"](context)
                
        except Exception as e:
            self.logger.error(f"Failed to run hook {hook_id}: {str(e)}")
            raise
            
    def remove_hook(self, hook_id: str) -> None:
        """Remove a validation hook"""
        try:
            if hook_id in self.hooks:
                del self.hooks[hook_id]
                
        except Exception as e:
            self.logger.error(f"Failed to remove hook {hook_id}: {str(e)}")
            raise
            
    def get_hooks(self, phase_id: Optional[str] = None) -> List[Dict]:
        """Get all hooks for a phase"""
        try:
            if phase_id:
                return [
                    {**hook, "id": hook_id}
                    for hook_id, hook in self.hooks.items()
                    if hook["phase_id"] == phase_id
                ]
            return [
                {**hook, "id": hook_id}
                for hook_id, hook in self.hooks.items()
            ]
            
        except Exception as e:
            self.logger.error(f"Failed to get hooks: {str(e)}")
            raise
