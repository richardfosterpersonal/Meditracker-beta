"""
Core Validation Service
Critical Path: VALIDATION-CORE-SERVICE
Last Updated: 2025-01-02T20:01:23+01:00

Centralized validation service using unified framework.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from pathlib import Path

from .unified_validation_framework import UnifiedValidationFramework
from .unified_decorator import unified_validation
from .exceptions import ValidationError
from .settings import settings
from .logging import service_logger

class ValidationService:
    """Centralized validation service using unified framework"""
    
    def __init__(self):
        self.unified_framework = UnifiedValidationFramework()
        self.validation_cache = {}
        self.validation_interval = timedelta(minutes=settings.VALIDATION_INTERVAL_MINUTES)
        self.logger = service_logger
        
        # Register request validation patterns
        self._register_request_patterns()
        
    def _register_request_patterns(self) -> None:
        """Register request validation patterns"""
        self.unified_framework.register_pattern(
            pattern_id="request_validation",
            relevance=1.0,
            rules={
                "required_headers": {
                    "Content-Type": ["application/json"],
                    "Accept": ["application/json"],
                    "X-Request-ID": True
                },
                "rate_limiting": {
                    "max_requests_per_minute": 60,
                    "max_requests_per_hour": 1000
                },
                "security": {
                    "require_https": True,
                    "validate_cors": True,
                    "check_content_security": True
                }
            }
        )
        
        self.unified_framework.register_pattern(
            pattern_id="medication_request",
            relevance=0.9,
            rules={
                "required_fields": {
                    "POST": ["name", "dosage", "schedule"],
                    "PUT": ["id", "name", "dosage", "schedule"],
                    "DELETE": ["id"]
                },
                "field_validation": {
                    "name": {"type": "string", "min_length": 1, "max_length": 200},
                    "dosage": {"type": "string", "pattern": r"^\d+(\.\d+)?\s*(mg|ml|g)$"},
                    "schedule": {"type": "object"}
                }
            }
        )
        
        self.unified_framework.register_pattern(
            pattern_id="notification_request",
            relevance=0.8,
            rules={
                "required_fields": {
                    "POST": ["user_id", "message", "priority"],
                    "PUT": ["id", "user_id", "message", "priority"],
                    "DELETE": ["id"]
                },
                "field_validation": {
                    "user_id": {"type": "string", "min_length": 1},
                    "message": {"type": "string", "max_length": 500},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]}
                }
            }
        )
        
    @unified_validation(critical_path="Validation.Request", validation_layer="Application")
    async def validate_request(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate incoming request"""
        try:
            # Check cache first
            cache_key = f"request_{context['endpoint']}_{context['method']}"
            if self._is_cache_valid(cache_key):
                return self.validation_cache[cache_key]["result"]
                
            # Get relevant patterns
            patterns = self._get_relevant_patterns(context)
            
            # Run validation
            result = await self.unified_framework.validate_critical_path(
                "Request Validation",
                context=context,
                patterns=patterns
            )
            
            # Cache result
            self._update_cache(cache_key, result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Request validation failed: {str(e)}")
            raise ValidationError(f"Request validation failed: {str(e)}")
            
    def _get_relevant_patterns(self, context: Dict[str, Any]) -> List[str]:
        """Get relevant patterns for context"""
        patterns = ["request_validation"]  # Always include base validation
        
        # Add endpoint-specific patterns
        endpoint = context["endpoint"]
        if "medication" in endpoint:
            patterns.append("medication_request")
        elif "notification" in endpoint:
            patterns.append("notification_request")
            
        return patterns
        
    @unified_validation(critical_path="Validation.Configuration", validation_layer="Infrastructure") 
    async def validate_configuration(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate configuration"""
        return await self.unified_framework.validate_critical_path("Configuration Validation")
        
    @unified_validation(critical_path="Validation.Database", validation_layer="Infrastructure")
    async def validate_database(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate database state"""
        return await self.unified_framework.validate_critical_path("Database Validation")
        
    @unified_validation(critical_path="Validation.CriticalPath", validation_layer="Domain")
    async def validate_critical_path(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate critical path components"""
        return await self.unified_framework.validate_critical_path("Critical Path Validation")
        
    @unified_validation(critical_path="Validation.Deployment", validation_layer="Infrastructure")
    async def validate_deployment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate deployment readiness"""
        return await self.unified_framework.validate_critical_path("Deployment Validation")
        
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached validation is still valid"""
        if key not in self.validation_cache:
            return False
            
        cache_time = self.validation_cache[key]["timestamp"]
        return (datetime.now(timezone.utc) - cache_time) < self.validation_interval
        
    def _update_cache(self, key: str, result: Dict[str, Any]) -> None:
        """Update validation cache"""
        self.validation_cache[key] = {
            "result": result,
            "timestamp": datetime.now(timezone.utc)
        }

# Create singleton instance
validation_service = ValidationService()
