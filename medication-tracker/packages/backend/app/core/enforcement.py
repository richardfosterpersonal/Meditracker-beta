"""
Process Enforcement System
Last Updated: 2024-12-27T21:21:34+01:00
Critical Path: Enforcement

This module enforces critical path processes through hooks and decorators.
"""

import functools
from datetime import datetime
from typing import Any, Callable, Dict, Type, Optional, List
from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from .validation_manifest import manifest
from .logging import config_logger
import os
import importlib.util

logger = config_logger.get_logger(__name__)

class EnforcementError(Exception):
    """Raised when a critical path process is violated"""
    pass

class ValidationError(Exception):
    """Raised when validation requirements are not met"""
    pass

class ProcessEnforcer:
    """Enforces critical path processes through various mechanisms"""
    
    def __init__(self):
        self.reference_time = datetime.fromisoformat("2025-01-02T13:15:28+01:00")
        self._hooks: Dict[str, list] = {
            "pre_request": [],
            "post_request": [],
            "pre_startup": [],
            "post_shutdown": [],
            "pre_beta_validation": [],
            "post_beta_validation": [],
            "beta_phase_transition": []
        }
        self._validation_requirements = {
            "Beta.Validation": {
                "environment": ["JWT_SECRET_KEY", "DATABASE_URL", "BETA_MODE"],
                "directories": ["/validation_evidence", "/beta_evidence", "/metrics"],
                "dependencies": ["aiohttp", "attrs", "pyyaml"]
            }
        }
    
    def enforce_critical_path(self, func: Callable) -> Callable:
        """Decorator to enforce critical path validation before execution"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if not manifest.get_validation_status()["is_valid"]:
                raise EnforcementError("Critical path validation failed")
            return await func(*args, **kwargs)
        return wrapper
    
    def validate_timestamp(self, func: Callable) -> Callable:
        """Decorator to ensure timestamp alignment with reference time"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if "timestamp" in kwargs:
                ts = kwargs["timestamp"]
                if isinstance(ts, datetime) and ts < self.reference_time:
                    raise EnforcementError("Timestamp precedes reference time")
            return await func(*args, **kwargs)
        return wrapper
    
    def register_hook(self, hook_type: str, hook_func: Callable) -> None:
        """Register a new enforcement hook"""
        if hook_type not in self._hooks:
            raise ValueError(f"Invalid hook type: {hook_type}")
        self._hooks[hook_type].append(hook_func)
    
    async def execute_hooks(self, hook_type: str, *args, **kwargs) -> None:
        """Execute all registered hooks of a given type"""
        for hook in self._hooks[hook_type]:
            await hook(*args, **kwargs)

    def enforce_beta_validation(self, func: Callable) -> Callable:
        """Decorator to enforce beta validation requirements"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Pre-validation hooks
            await self.execute_hooks("pre_beta_validation")
            
            # Validate requirements
            requirements = self._validation_requirements["Beta.Validation"]
            for category, items in requirements.items():
                if not await self._validate_requirements(category, items):
                    raise ValidationError(f"Beta validation failed: {category} requirements not met")
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Post-validation hooks
            await self.execute_hooks("post_beta_validation")
            
            return result
        return wrapper

    async def _validate_requirements(self, category: str, items: List[str]) -> bool:
        """Validate specific requirements category"""
        if category == "environment":
            return all(os.getenv(var) for var in items)
        elif category == "directories":
            return all(os.path.exists(dir) for dir in items)
        elif category == "dependencies":
            return all(importlib.util.find_spec(pkg) for pkg in items)
        return False

class EnforcementMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce processes on all requests"""
    
    def __init__(self, app: FastAPI, enforcer: ProcessEnforcer):
        super().__init__(app)
        self.enforcer = enforcer
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Enforce processes before and after each request"""
        # Pre-request enforcement
        await self.enforcer.execute_hooks("pre_request", request)
        
        # Validate critical path
        if not manifest.get_validation_status()["is_valid"]:
            raise EnforcementError("Critical path validation failed")
        
        response = await call_next(request)
        
        # Post-request enforcement
        await self.enforcer.execute_hooks("post_request", request, response)
        
        return response

def enforce_beta_access(func: Callable) -> Callable:
    """Decorator to enforce beta access validation"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        from .beta_access import BetaAccessManager
        if not await BetaAccessManager.validate_access():
            raise EnforcementError("Beta access validation failed")
        return await func(*args, **kwargs)
    return wrapper

# Create singleton enforcer
enforcer = ProcessEnforcer()
