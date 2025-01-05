"""
Validation Manager
Critical Path: VALIDATION-MANAGER
Last Updated: 2025-01-02T20:12:18+01:00

Central validation manager that enforces both static and dynamic validation rules.
"""

import logging
from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timezone
from functools import wraps

from .constants import (
    CriticalPath,
    ValidationLayer,
    STATIC_VALIDATION_RULES,
    DYNAMIC_VALIDATION_CONFIGS,
    CRITICAL_VALIDATIONS,
    BETA_VALIDATIONS,
    ERROR_MESSAGES
)
from ..exceptions import ValidationError, CriticalValidationError
from ..logging import validation_logger

class ValidationManager:
    """
    Central validation manager that enforces validation rules.
    This is a singleton to ensure consistent validation across the application.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        self.logger = validation_logger
        self._initialized = True
        self._static_rules = STATIC_VALIDATION_RULES
        self._dynamic_configs = DYNAMIC_VALIDATION_CONFIGS.copy()
        self._critical_paths = CRITICAL_VALIDATIONS
        self._beta_config = BETA_VALIDATIONS
        
        # Initialize validation state
        self._validation_state = {
            "initialized_at": datetime.now(timezone.utc).isoformat(),
            "beta_mode": self._dynamic_configs["beta"]["enabled"],
            "critical_paths_validated": False
        }
        
        # Validate critical paths on initialization
        self._validate_critical_paths()
        
    def _validate_critical_paths(self) -> None:
        """
        Validate all critical paths during initialization.
        This ensures core functionality works before the app starts.
        """
        try:
            for path in self._critical_paths:
                self.logger.info(f"Validating critical path: {path}")
                module, rule = path.split(".")
                
                if module not in self._static_rules:
                    raise CriticalValidationError(f"Missing critical module: {module}")
                if rule not in self._static_rules[module]:
                    raise CriticalValidationError(f"Missing critical rule: {path}")
                    
            self._validation_state["critical_paths_validated"] = True
            self.logger.info("All critical paths validated successfully")
            
        except Exception as e:
            self.logger.error(f"Critical path validation failed: {str(e)}")
            raise CriticalValidationError(f"Critical path validation failed: {str(e)}")
            
    def validate(
        self,
        path: CriticalPath,
        layer: ValidationLayer,
        data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate data against both static and dynamic rules.
        
        Args:
            path: Critical path being validated
            layer: Validation layer (system, security, business, etc.)
            data: Data to validate
            context: Optional validation context
            
        Returns:
            Dict containing validation results and metadata
        """
        try:
            # Start with static validation
            self._validate_static_rules(path, data)
            
            # Apply dynamic validation if configured
            if self._should_apply_dynamic_validation(path, layer):
                self._validate_dynamic_rules(path, data, context)
                
            # Apply extra beta validations if in beta mode
            if self._validation_state["beta_mode"]:
                self._validate_beta_rules(path, data, context)
                
            return {
                "valid": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": path,
                "layer": layer,
                "context": context
            }
            
        except ValidationError as e:
            self.logger.error(f"Validation failed: {str(e)}")
            raise
            
    def _validate_static_rules(self, path: CriticalPath, data: Dict[str, Any]) -> None:
        """Apply static validation rules"""
        module = path.lower()
        if module not in self._static_rules:
            return  # No static rules for this path
            
        rules = self._static_rules[module]
        for field, rule in rules.items():
            if field not in data and rule.get("required", False):
                raise ValidationError(
                    f"Missing required field: {field}",
                    path=path,
                    field=field
                )
                
            if field in data:
                self._validate_field(field, data[field], rule, path)
                
    def _validate_field(
        self,
        field: str,
        value: Any,
        rule: Dict[str, Any],
        path: CriticalPath
    ) -> None:
        """Validate a single field against its rules"""
        field_type = rule.get("type")
        
        # Type validation
        if field_type == "string" and not isinstance(value, str):
            raise ValidationError(
                f"Field {field} must be a string",
                path=path,
                field=field
            )
        elif field_type == "integer" and not isinstance(value, int):
            raise ValidationError(
                f"Field {field} must be an integer",
                path=path,
                field=field
            )
            
        # String validations
        if isinstance(value, str):
            max_length = rule.get("max_length")
            pattern = rule.get("pattern")
            
            if max_length and len(value) > max_length:
                raise ValidationError(
                    f"Field {field} exceeds maximum length of {max_length}",
                    path=path,
                    field=field
                )
                
            if pattern and not re.match(pattern, value):
                raise ValidationError(
                    ERROR_MESSAGES[path.lower()].get(
                        f"invalid_{field}",
                        f"Invalid format for field {field}"
                    ),
                    path=path,
                    field=field
                )
                
    def _should_apply_dynamic_validation(
        self,
        path: CriticalPath,
        layer: ValidationLayer
    ) -> bool:
        """Determine if dynamic validation should be applied"""
        # Always apply dynamic validation for non-critical paths
        if str(path).lower() not in self._critical_paths:
            return True
            
        # For critical paths, only apply dynamic validation in certain layers
        return layer in {
            ValidationLayer.INTERFACE,
            ValidationLayer.BUSINESS
        }
        
    def _validate_dynamic_rules(
        self,
        path: CriticalPath,
        data: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> None:
        """Apply dynamic validation rules"""
        module = path.lower()
        if module not in self._dynamic_configs:
            return
            
        config = self._dynamic_configs[module]
        
        # Apply rate limiting
        if "rate_limits" in config:
            self._check_rate_limits(path, context, config["rate_limits"])
            
        # Apply notification rules
        if module == "notifications" and context:
            self._validate_notification_rules(data, context, config)
            
    def _validate_beta_rules(
        self,
        path: CriticalPath,
        data: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> None:
        """Apply additional beta testing validations"""
        if not self._beta_config["logging"]["enabled"]:
            return
            
        # Log detailed validation info for beta testing
        self.logger.debug(
            "Beta validation",
            extra={
                "path": path,
                "data": data,
                "context": context,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Check monitoring thresholds
        if self._beta_config["monitoring"]["enabled"]:
            self._check_beta_thresholds(path, context)
            
    def _check_rate_limits(
        self,
        path: CriticalPath,
        context: Optional[Dict[str, Any]],
        limits: Dict[str, int]
    ) -> None:
        """Check rate limits"""
        if not context or "user_id" not in context:
            return
            
        # TODO: Implement rate limiting logic
        pass
        
    def _validate_notification_rules(
        self,
        data: Dict[str, Any],
        context: Dict[str, Any],
        config: Dict[str, Any]
    ) -> None:
        """Validate notification-specific rules"""
        if "quiet_hours" in config:
            current_hour = datetime.now(timezone.utc).hour
            quiet_start = int(config["quiet_hours"]["start"].split(":")[0])
            quiet_end = int(config["quiet_hours"]["end"].split(":")[0])
            
            if quiet_start <= current_hour < quiet_end:
                priority = data.get("priority", "low")
                if priority.lower() != "emergency":
                    raise ValidationError(
                        "Non-emergency notifications are not allowed during quiet hours"
                    )
                    
    def _check_beta_thresholds(
        self,
        path: CriticalPath,
        context: Optional[Dict[str, Any]]
    ) -> None:
        """Check beta testing thresholds"""
        if not context:
            return
            
        thresholds = self._beta_config["monitoring"]["alert_thresholds"]
        
        # Check error rate
        if "error_count" in context and "total_requests" in context:
            error_rate = context["error_count"] / context["total_requests"]
            if error_rate > thresholds["error_rate"]:
                self.logger.warning(
                    f"Beta error rate threshold exceeded: {error_rate:.2%}"
                )
                
        # Check response time
        if "response_time" in context:
            if context["response_time"] > thresholds["response_time"]:
                self.logger.warning(
                    f"Beta response time threshold exceeded: {context['response_time']}ms"
                )

# Create singleton instance
validation_manager = ValidationManager()
