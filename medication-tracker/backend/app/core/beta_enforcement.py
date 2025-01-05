"""
Beta Access Enforcement
Last Updated: 2024-12-27T21:50:34+01:00
Critical Path: Beta.Enforcement
"""

from functools import wraps
from typing import Callable, Any, Dict
from fastapi import HTTPException, Request
from .validation_manifest import manifest
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BetaEnforcer:
    """Enforces beta testing critical path"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T21:50:34+01:00"
        self._validate_beta_state()
    
    def _validate_beta_state(self):
        """Validate beta testing state in manifest"""
        if not manifest.critical_paths.get("Beta", {}).get("stage") == "testing":
            raise ValueError("Beta testing not properly configured in manifest")
        
        manifest.update_critical_path("Beta", {
            "last_check": self.reference_time,
            "status": "active"
        })
    
    def enforce_critical_path(self, func: Callable) -> Callable:
        """Enforce critical path for beta endpoints"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Validate manifest state
                if not manifest.get_validation_status()["is_valid"]:
                    raise HTTPException(
                        status_code=503,
                        detail="Beta system validation failed"
                    )
                
                # Validate database configuration
                db_config = manifest.critical_paths["Database"]
                if not (
                    db_config["type"] == "SQLite" and
                    db_config["constraints"]["beta_testing"]
                ):
                    raise HTTPException(
                        status_code=503,
                        detail="Invalid database configuration for beta testing"
                    )
                
                # Execute endpoint
                result = await func(*args, **kwargs)
                
                # Log successful execution
                logger.info(
                    f"Beta endpoint executed successfully: {func.__name__}",
                    extra={
                        "timestamp": self.reference_time,
                        "critical_path": "Beta.API"
                    }
                )
                
                return result
                
            except Exception as e:
                logger.error(
                    f"Beta critical path violation: {str(e)}",
                    extra={
                        "timestamp": self.reference_time,
                        "critical_path": "Beta.Error"
                    }
                )
                raise
    
    def enforce_onboarding_stage(self, stage: str) -> Callable:
        """Enforce beta onboarding stages"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    # Validate stage against manifest
                    beta_features = manifest.critical_paths["Beta"]["features"]
                    if stage not in beta_features:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid beta stage: {stage}"
                        )
                    
                    # Execute endpoint
                    result = await func(*args, **kwargs)
                    
                    # Log stage completion
                    logger.info(
                        f"Beta stage completed: {stage}",
                        extra={
                            "timestamp": self.reference_time,
                            "critical_path": "Beta.Onboarding"
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    logger.error(
                        f"Beta stage validation failed: {str(e)}",
                        extra={
                            "timestamp": self.reference_time,
                            "critical_path": "Beta.Error"
                        }
                    )
                    raise
            return wrapper
        return decorator

# Create enforcer instance
beta_enforcer = BetaEnforcer()
