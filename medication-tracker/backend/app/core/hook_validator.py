"""
Hook Validator
Critical Path: HOOK-VAL-*
Last Updated: 2025-01-02T10:49:54+01:00

Validates beta launch hooks.
"""

import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

from ..exceptions import ValidationError

logger = logging.getLogger(__name__)

class HookValidationLevel(Enum):
    """Validation levels for hooks"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class HookValidationScope(Enum):
    """Scope of hook validation"""
    SYSTEM = "system"
    COMPONENT = "component"
    FEATURE = "feature"
    USER = "user"
    DATA = "data"

class HookValidationType(Enum):
    """Types of hook validation"""
    PROCESS = "process"
    BOOTSTRAP = "bootstrap"
    PRE_VALIDATION = "pre_validation"
    VALIDATION = "validation"
    POST_VALIDATION = "post_validation"
    CLEANUP = "cleanup"

@dataclass
class HookValidationRule:
    """Rule for validating hooks"""
    name: str
    level: HookValidationLevel
    scope: HookValidationScope
    validation_type: HookValidationType
    error_message: str

class HookValidator:
    """Validates hooks for beta launch"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(__file__).parent.parent.parent.parent
        self.validation_rules = [
            HookValidationRule(
                "conversation_guidelines",
                HookValidationLevel.CRITICAL,
                HookValidationScope.SYSTEM,
                HookValidationType.PROCESS,
                "Conversation guidelines hook validation failed"
            ),
            HookValidationRule(
                "debug_practices",
                HookValidationLevel.HIGH,
                HookValidationScope.COMPONENT,
                HookValidationType.PROCESS,
                "Debug practices hook validation failed"
            ),
            HookValidationRule(
                "process",
                HookValidationLevel.CRITICAL,
                HookValidationScope.SYSTEM,
                HookValidationType.PROCESS,
                "Process hook validation failed"
            ),
            HookValidationRule(
                "documentation",
                HookValidationLevel.HIGH,
                HookValidationScope.COMPONENT,
                HookValidationType.PROCESS,
                "Documentation hook validation failed"
            ),
            HookValidationRule(
                "dependencies",
                HookValidationLevel.CRITICAL,
                HookValidationScope.SYSTEM,
                HookValidationType.PROCESS,
                "Dependencies hook validation failed"
            )
        ]
        
    def validate_hook(self, hook_name: str, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a single hook
        
        Args:
            hook_name: Name of the hook to validate
            hook_data: Hook data to validate
            
        Returns:
            Dict with validation results
        """
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Find matching rule
        rule = next(
            (r for r in self.validation_rules if r.name == hook_name),
            None
        )
        
        if not rule:
            results["warnings"].append(f"No validation rule found for hook: {hook_name}")
            return results
            
        # Validate hook data
        try:
            if not hook_data.get("validated", False):
                error = f"{rule.error_message}: {hook_name} not validated"
                if rule.level == HookValidationLevel.CRITICAL:
                    results["errors"].append(error)
                else:
                    results["warnings"].append(error)
                    
        except Exception as e:
            results["errors"].append(f"Hook validation failed for {hook_name}: {str(e)}")
            
        results["valid"] = len(results["errors"]) == 0
        return results
        
    def validate_hooks(self, hooks_data: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate all hooks
        
        Args:
            hooks_data: Dict of hook data to validate
            
        Returns:
            Dict with validation results
        """
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "hooks_checked": 0
        }
        
        for hook_name, hook_data in hooks_data.items():
            results["hooks_checked"] += 1
            hook_results = self.validate_hook(hook_name, hook_data)
            
            if not hook_results["valid"]:
                results["valid"] = False
                
            results["errors"].extend(hook_results["errors"])
            results["warnings"].extend(hook_results["warnings"])
            
        return results
        
    @classmethod
    def create_validator(cls, project_root: Optional[Path] = None) -> 'HookValidator':
        """Create a new hook validator instance"""
        return cls(project_root)
