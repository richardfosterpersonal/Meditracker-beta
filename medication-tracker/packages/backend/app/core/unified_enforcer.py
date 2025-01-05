"""
Unified Validation Enforcer
Critical Path: VALIDATION-ENFORCER
Last Updated: 2025-01-02T13:29:35+01:00

Enforces unified validation across ALL system components.
"""

import ast
import inspect
from pathlib import Path
from typing import Dict, Any, List, Set, Optional
from datetime import datetime, timezone
import logging
from functools import wraps

from .unified_validation_framework import UnifiedValidationFramework
from .exceptions import ValidationError, EnforcementError

class UnifiedEnforcer:
    """Enforces unified validation across all components"""
    
    def __init__(self):
        self.framework = UnifiedValidationFramework()
        self.validated_components: Set[str] = set()
        self.evidence_collector = self.framework.evidence_collector
        self.critical_path_validator = self.framework.critical_path_validator
        
    async def enforce_unified_validation(self, component: Any) -> None:
        """Enforce unified validation on a component"""
        component_id = self._get_component_id(component)
        
        if not self._is_using_unified_decorator(component):
            raise EnforcementError(
                f"Component {component_id} must use @unified_validation decorator"
            )
            
        if not self._has_evidence_collection(component):
            raise EnforcementError(
                f"Component {component_id} must collect validation evidence"
            )
            
        if not self._is_on_critical_path(component):
            raise EnforcementError(
                f"Component {component_id} must be registered on critical path"
            )
            
        # Register successful validation
        self.validated_components.add(component_id)
        await self._store_validation_evidence(component)
        
    def _get_component_id(self, component: Any) -> str:
        """Get unique identifier for component"""
        if inspect.isclass(component):
            return f"{component.__module__}.{component.__name__}"
        elif inspect.isfunction(component):
            return f"{component.__module__}.{component.__qualname__}"
        else:
            return f"{component.__class__.__module__}.{component.__class__.__name__}"
            
    def _is_using_unified_decorator(self, component: Any) -> bool:
        """Check if component uses @unified_validation"""
        source = inspect.getsource(component)
        tree = ast.parse(source)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Decorator):
                if 'unified_validation' in ast.unparse(node):
                    return True
        return False
        
    def _has_evidence_collection(self, component: Any) -> bool:
        """Check if component collects validation evidence"""
        source = inspect.getsource(component)
        return 'unified_framework.validate_critical_path' in source
        
    def _is_on_critical_path(self, component: Any) -> bool:
        """Check if component is registered on critical path"""
        component_id = self._get_component_id(component)
        return self.critical_path_validator.is_on_critical_path(component_id)
        
    async def _store_validation_evidence(self, component: Any) -> None:
        """Store validation evidence for component"""
        component_id = self._get_component_id(component)
        
        evidence = {
            "component_id": component_id,
            "validation_time": datetime.now(timezone.utc).isoformat(),
            "validation_type": "unified_enforcement",
            "source_file": inspect.getfile(component),
            "critical_path": self._get_critical_path(component),
            "validation_layer": self._get_validation_layer(component)
        }
        
        await self.evidence_collector.store_evidence(evidence)
        
    def _get_critical_path(self, component: Any) -> str:
        """Get critical path for component"""
        source = inspect.getsource(component)
        tree = ast.parse(source)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Decorator):
                decorator_source = ast.unparse(node)
                if 'critical_path=' in decorator_source:
                    return decorator_source.split('critical_path=')[1].split(',')[0].strip('"\'')
        return "UNKNOWN"
        
    def _get_validation_layer(self, component: Any) -> str:
        """Get validation layer for component"""
        source = inspect.getsource(component)
        tree = ast.parse(source)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Decorator):
                decorator_source = ast.unparse(node)
                if 'validation_layer=' in decorator_source:
                    return decorator_source.split('validation_layer=')[1].split(',')[0].strip('"\'')
        return "UNKNOWN"
        
def enforce_validation(component: Any):
    """Decorator to enforce unified validation"""
    enforcer = UnifiedEnforcer()
    
    @wraps(component)
    async def wrapper(*args, **kwargs):
        await enforcer.enforce_unified_validation(component)
        return await component(*args, **kwargs)
        
    return wrapper
