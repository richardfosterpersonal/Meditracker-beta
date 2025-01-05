"""
Unified Validation Framework
Critical Path: VALIDATION-FRAMEWORK
Last Updated: 2025-01-02T20:01:23+01:00
"""

import logging
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone
from functools import wraps

from ..exceptions import ValidationError, DependencyError
from ..models.validation_result import ValidationResult
from ..services.metrics_service import MetricsService

logger = logging.getLogger(__name__)

class UnifiedValidationFramework:
    """Unified validation framework with import validation"""
    
    def __init__(self):
        self.import_validator = ImportValidator()
        self.hooks = ValidationHooks()
        self.enforcer = RuntimeEnforcer()
        self.validation_patterns: Dict[str, Any] = {}
        self.adaptation_history: List[Dict[str, Any]] = []
        self.validated_imports = False
        
        # Register core patterns
        self._register_core_patterns()
        
    def register_pattern(self, pattern_id: str, relevance: float, rules: Dict[str, Any]) -> None:
        """Register a validation pattern"""
        self.validation_patterns[pattern_id] = {
            "id": pattern_id,
            "relevance": relevance,
            "rules": rules,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    async def validate_critical_path(
        self,
        path_name: str,
        context: Dict[str, Any],
        patterns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Validate a critical path"""
        try:
            # Run pre-validation hooks
            for hook in self.hooks.pre_hooks:
                await hook(context)
                
            # Apply validation patterns
            results = []
            used_patterns = []
            
            if patterns:
                # Use specified patterns
                for pattern_id in patterns:
                    if pattern_id in self.validation_patterns:
                        pattern = self.validation_patterns[pattern_id]
                        result = await self._apply_pattern(pattern, context)
                        results.append(result)
                        used_patterns.append(pattern_id)
            else:
                # Use all relevant patterns
                for pattern_id, pattern in self.validation_patterns.items():
                    if self._is_pattern_relevant(pattern, context):
                        result = await self._apply_pattern(pattern, context)
                        results.append(result)
                        used_patterns.append(pattern_id)
                        
            # Run post-validation hooks
            for hook in self.hooks.post_hooks:
                await hook(context, results)
                
            # Collect validation evidence
            evidence = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path_name": path_name,
                "patterns_applied": used_patterns,
                "validation_results": results
            }
            
            # Check if any validation failed
            is_valid = all(r.get("valid", False) for r in results)
            issues = []
            warnings = []
            
            for result in results:
                issues.extend(result.get("issues", []))
                warnings.extend(result.get("warnings", []))
                
            return {
                "valid": is_valid,
                "evidence": evidence,
                "issues": issues,
                "warnings": warnings
            }
            
        except Exception as e:
            logger.error(f"Critical path validation failed: {str(e)}")
            raise ValidationError(f"Critical path validation failed: {str(e)}")
            
    async def _apply_pattern(self, pattern: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply a validation pattern"""
        try:
            rules = pattern["rules"]
            issues = []
            warnings = []
            
            # Validate required headers
            if "required_headers" in rules:
                headers = context.get("headers", {})
                for header, values in rules["required_headers"].items():
                    if header not in headers:
                        issues.append(f"Missing required header: {header}")
                    elif isinstance(values, list) and headers[header] not in values:
                        issues.append(f"Invalid value for header {header}: {headers[header]}")
                        
            # Validate required fields
            if "required_fields" in rules:
                method = context.get("method", "").upper()
                if method in rules["required_fields"]:
                    data = context.get("data", {})
                    for field in rules["required_fields"][method]:
                        if field not in data:
                            issues.append(f"Missing required field: {field}")
                            
            # Validate field values
            if "field_validation" in rules:
                data = context.get("data", {})
                for field, validation in rules["field_validation"].items():
                    if field in data:
                        value = data[field]
                        field_type = validation.get("type")
                        
                        # Type validation
                        if field_type == "string" and not isinstance(value, str):
                            issues.append(f"Field {field} must be a string")
                        elif field_type == "object" and not isinstance(value, dict):
                            issues.append(f"Field {field} must be an object")
                            
                        # String validations
                        if isinstance(value, str):
                            min_length = validation.get("min_length")
                            max_length = validation.get("max_length")
                            pattern = validation.get("pattern")
                            enum = validation.get("enum")
                            
                            if min_length and len(value) < min_length:
                                issues.append(f"Field {field} must be at least {min_length} characters")
                            if max_length and len(value) > max_length:
                                issues.append(f"Field {field} must be at most {max_length} characters")
                            if pattern and not re.match(pattern, value):
                                issues.append(f"Field {field} has invalid format")
                            if enum and value not in enum:
                                issues.append(f"Field {field} must be one of: {', '.join(enum)}")
                                
            return {
                "valid": len(issues) == 0,
                "pattern_id": pattern["id"],
                "issues": issues,
                "warnings": warnings
            }
            
        except Exception as e:
            logger.error(f"Pattern application failed: {str(e)}")
            raise ValidationError(f"Pattern application failed: {str(e)}")
            
    def _is_pattern_relevant(self, pattern: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Check if a pattern is relevant for the context"""
        try:
            # Get pattern metadata
            pattern_id = pattern["id"]
            relevance = pattern.get("relevance", 0.0)
            
            # Check endpoint-specific patterns
            endpoint = context.get("endpoint", "")
            if "medication" in pattern_id and "medication" not in endpoint:
                return False
            if "notification" in pattern_id and "notification" not in endpoint:
                return False
                
            # Use pattern relevance as probability threshold
            return relevance > 0.5
            
        except Exception as e:
            logger.error(f"Pattern relevance check failed: {str(e)}")
            return False
            
    def validate_imports(self) -> None:
        """Validate imports across the codebase"""
        if not self.validated_imports:
            try:
                self.import_validator.validate_imports("app")
                self.validated_imports = True
            except Exception as e:
                logger.error(f"Import validation failed: {str(e)}")
                raise ValidationError(f"Import validation failed: {str(e)}")

class ImportValidator:
    """Validates imports across the codebase"""
    
    def __init__(self):
        self.validated_modules: Set[str] = set()
        self.import_graph: Dict[str, Set[str]] = {}
        self.timestamp = datetime.now(timezone.utc).isoformat()
        
    def validate_imports(self, module_path: str) -> None:
        """Validate imports for a module and its dependencies"""
        try:
            # Skip if already validated
            if module_path in self.validated_modules:
                return
                
            # Get module dependencies
            dependencies = self._get_module_dependencies(module_path)
            
            # Check for circular dependencies
            for dependency in dependencies:
                if self._has_circular_dependency(module_path, dependency):
                    raise DependencyError(
                        f"Circular dependency detected: {module_path} -> {dependency}"
                    )
                    
            # Update import graph
            self.import_graph[module_path] = dependencies
            self.validated_modules.add(module_path)
            
            # Validate dependencies recursively
            for dependency in dependencies:
                self.validate_imports(dependency)
                
        except Exception as e:
            logger.error(f"Import validation failed for {module_path}: {str(e)}")
            raise
            
    def _get_module_dependencies(self, module_path: str) -> Set[str]:
        """Get dependencies for a module"""
        # TODO: Implement actual module dependency analysis
        return set()
        
    def _has_circular_dependency(self, source: str, target: str) -> bool:
        """Check for circular dependencies"""
        if target not in self.import_graph:
            return False
            
        visited = {source}
        stack = [target]
        
        while stack:
            current = stack.pop()
            if current in visited:
                return True
                
            visited.add(current)
            stack.extend(self.import_graph.get(current, set()))
            
        return False

class ValidationHooks:
    """Manages validation hooks and callbacks"""
    
    def __init__(self):
        self.pre_hooks: List[callable] = []
        self.post_hooks: List[callable] = []
        
    def register_pre_hook(self, hook: callable) -> None:
        """Register a pre-validation hook"""
        self.pre_hooks.append(hook)
        
    def register_post_hook(self, hook: callable) -> None:
        """Register a post-validation hook"""
        self.post_hooks.append(hook)

class RuntimeEnforcer:
    """Enforces runtime validation rules"""
    
    def __init__(self):
        self.active_rules: Dict[str, Any] = {}
        self.metrics = MetricsService()
        
    def enforce(self, context: Dict[str, Any]) -> None:
        """Enforce runtime validation rules"""
        try:
            # TODO: Implement runtime rule enforcement
            pass
        except Exception as e:
            logger.error(f"Runtime enforcement failed: {str(e)}")
            raise ValidationError(f"Runtime enforcement failed: {str(e)}")

def unified_validation(critical_path: str, validation_layer: str):
    """Decorator for unified validation"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Get validation context
                context = kwargs.get("context", {})
                context.update({
                    "critical_path": critical_path,
                    "validation_layer": validation_layer,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
                return await func(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Unified validation failed: {str(e)}")
                raise ValidationError(f"Unified validation failed: {str(e)}")
                
        return wrapper
    return decorator
