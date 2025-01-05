"""
Beta validation runner
Critical Path: BETA-VALIDATION-*
Last Updated: 2025-01-02T13:21:22+01:00

Runs complete beta validation using unified validation framework.
"""

import logging
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from .unified_validation_framework import UnifiedValidationFramework
from .unified_decorator import unified_validation
from .beta_feature_flags import BetaFeatureFlagManager
from .beta_user_manager import BetaUserManager
from .beta_data_manager import BetaDataManager
from .beta_monitoring import BetaMonitoring
from .beta_metrics import BetaMetrics
from backend.app.exceptions import BetaValidationError

logger = logging.getLogger(__name__)

class BetaValidationRunner:
    """Runs complete beta validation using unified framework"""
    
    def __init__(self):
        self.unified_framework = UnifiedValidationFramework()
        self.feature_flags = BetaFeatureFlagManager()
        self.user_manager = BetaUserManager()
        self.data_manager = BetaDataManager()
        self.monitoring = BetaMonitoring()
        self.feedback = BetaMetrics(Path("data/beta"))
        
    @unified_validation(critical_path="Beta.Environment", validation_layer="Infrastructure")
    async def validate_environment(self) -> Dict[str, Any]:
        """Validate beta environment"""
        return await self.unified_framework.validate_critical_path("Environment Validation")
        
    @unified_validation(critical_path="Beta.Features", validation_layer="Domain")
    async def validate_features(self) -> Dict[str, Any]:
        """Validate beta features"""
        return await self.unified_framework.validate_critical_path("Feature Verification")
        
    @unified_validation(critical_path="Beta.Performance", validation_layer="Infrastructure")
    async def validate_performance(self) -> Dict[str, Any]:
        """Validate beta performance"""
        return await self.unified_framework.validate_critical_path("Performance Metrics")
        
    @unified_validation(critical_path="Beta.UserExperience", validation_layer="Presentation")
    async def validate_user_experience(self) -> Dict[str, Any]:
        """Validate beta user experience"""
        return await self.unified_framework.validate_critical_path("User Experience")
        
    @unified_validation(critical_path="Beta.Recovery", validation_layer="Infrastructure")
    async def validate_recovery(self) -> Dict[str, Any]:
        """Validate beta recovery mechanisms"""
        return await self.unified_framework.validate_critical_path("System Backup")
        
    @unified_validation(critical_path="Beta.Launch", validation_layer="Application")
    async def run_validation(self) -> Dict[str, Any]:
        """Run complete beta validation"""
        try:
            # Follow critical path from single source of truth
            results = {
                "environment": await self.validate_environment(),
                "features": await self.validate_features(),
                "performance": await self.validate_performance(),
                "user_experience": await self.validate_user_experience(),
                "recovery": await self.validate_recovery()
            }
            
            # Check if all validations passed
            if not all(r.get("valid", False) for r in results.values()):
                return {
                    "valid": False,
                    "error": "Beta validation failed",
                    "details": results
                }
                
            return {
                "valid": True,
                "results": results,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Beta validation failed: {str(e)}")
            raise BetaValidationError("Failed to complete beta validation") from e

@unified_validation(critical_path="Beta.Launch", validation_layer="Application")
async def run_beta_validation() -> Dict[str, Any]:
    """Run beta validation using unified framework"""
    try:
        runner = BetaValidationRunner()
        return await runner.run_validation()
    except Exception as e:
        logger.error(f"Beta validation failed: {str(e)}")
        raise BetaValidationError("Failed to run beta validation") from e
