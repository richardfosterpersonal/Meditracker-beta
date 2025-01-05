"""
Development Mode Configuration
Enables development while maintaining validation integrity
Last Updated: 2025-01-01T20:32:45+01:00
"""

import os
from enum import Enum
from typing import Dict, Optional, Set
from datetime import datetime
import logging
from functools import wraps

class DevelopmentMode(Enum):
    STRICT = "strict"      # All validations enforced
    FLEXIBLE = "flexible"  # Non-critical validations warn only
    LOCAL = "local"        # Minimal validations for local development

class ValidationLevel(Enum):
    BLOCK = "block"    # Raise exception
    WARN = "warn"      # Log warning
    SKIP = "skip"      # Skip validation

class DevelopmentConfig:
    """Configures validation behavior for different development modes"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.mode = self._get_development_mode()
        
        # Initialize validation levels
        self.validation_levels = self._init_validation_levels()
        
        # Track deferred validations
        self.deferred_validations: Set[str] = set()
        
        # Development-specific overrides
        self.overrides: Dict[str, ValidationLevel] = {}
        
    def _get_development_mode(self) -> DevelopmentMode:
        """Get development mode from environment"""
        mode = os.getenv("DEV_MODE", "strict").lower()
        return DevelopmentMode(mode)
        
    def _init_validation_levels(self) -> Dict[str, Dict[str, ValidationLevel]]:
        """Initialize validation levels for different modes"""
        return {
            DevelopmentMode.STRICT.value: {
                "context": ValidationLevel.BLOCK,
                "scope": ValidationLevel.BLOCK,
                "requirements": ValidationLevel.BLOCK,
                "documentation": ValidationLevel.BLOCK,
                "critical_path": ValidationLevel.BLOCK
            },
            DevelopmentMode.FLEXIBLE.value: {
                "context": ValidationLevel.WARN,
                "scope": ValidationLevel.WARN,
                "requirements": ValidationLevel.BLOCK,
                "documentation": ValidationLevel.WARN,
                "critical_path": ValidationLevel.BLOCK
            },
            DevelopmentMode.LOCAL.value: {
                "context": ValidationLevel.SKIP,
                "scope": ValidationLevel.WARN,
                "requirements": ValidationLevel.WARN,
                "documentation": ValidationLevel.SKIP,
                "critical_path": ValidationLevel.WARN
            }
        }
        
    def get_validation_level(self, validation_type: str) -> ValidationLevel:
        """Get validation level for type"""
        # Check overrides first
        if validation_type in self.overrides:
            return self.overrides[validation_type]
            
        # Get from mode config
        return self.validation_levels[self.mode.value][validation_type]
        
    def defer_validation(self, validation_type: str):
        """Defer validation for later"""
        self.deferred_validations.add(validation_type)
        self.logger.info(f"Deferred validation: {validation_type}")
        
    def run_deferred_validations(self):
        """Run all deferred validations"""
        for validation in self.deferred_validations:
            self.logger.info(f"Running deferred validation: {validation}")
            # Implement validation logic here
            
        self.deferred_validations.clear()
        
    def override_validation(self, validation_type: str, level: ValidationLevel):
        """Override validation level"""
        self.overrides[validation_type] = level
        self.logger.info(
            f"Validation override: {validation_type} -> {level.value}"
        )
        
    def reset_overrides(self):
        """Reset all overrides"""
        self.overrides.clear()
        
class DevelopmentContext:
    """Context manager for temporary development mode changes"""
    
    def __init__(
        self,
        mode: Optional[DevelopmentMode] = None,
        overrides: Optional[Dict[str, ValidationLevel]] = None
    ):
        self.dev_config = DevelopmentConfig()
        self.previous_mode = self.dev_config.mode
        self.previous_overrides = self.dev_config.overrides.copy()
        self.temp_mode = mode
        self.temp_overrides = overrides
        
    def __enter__(self):
        if self.temp_mode:
            self.dev_config.mode = self.temp_mode
        if self.temp_overrides:
            self.dev_config.overrides.update(self.temp_overrides)
        return self.dev_config
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.dev_config.mode = self.previous_mode
        self.dev_config.overrides = self.previous_overrides

def flexible_validation(validation_type: str):
    """Decorator for flexible validation handling"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            dev_config = DevelopmentConfig()
            level = dev_config.get_validation_level(validation_type)
            
            try:
                if level == ValidationLevel.SKIP:
                    return await func(*args, **kwargs)
                    
                # Run validation
                validation_result = await func(*args, **kwargs)
                
                if not validation_result["valid"]:
                    if level == ValidationLevel.BLOCK:
                        raise ValueError(
                            f"Validation failed: {validation_result['error']}"
                        )
                    elif level == ValidationLevel.WARN:
                        dev_config.logger.warning(
                            f"Validation warning: {validation_result['error']}"
                        )
                        
                return validation_result
                
            except Exception as e:
                if level == ValidationLevel.BLOCK:
                    raise
                dev_config.logger.warning(f"Validation error: {str(e)}")
                return {
                    "valid": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        return wrapper
    return decorator
