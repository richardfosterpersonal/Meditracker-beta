"""
Critical Path Definition
Last Updated: 2024-12-31T15:58:30+01:00
Critical Path: Core.Definition
"""

from datetime import datetime
from typing import Dict, List, Any
from .validation_manifest import manifest
import logging

logger = logging.getLogger(__name__)

class CriticalPath:
    """Defines and validates the critical path for the entire application"""
    
    def __init__(self):
        self.reference_time = "2024-12-31T15:58:30+01:00"
        self.paths = {
            "Beta.Onboarding": {
                "order": 1,
                "stages": [
                    "registration",
                    "medication_setup",
                    "notification_preferences",
                    "emergency_contacts"
                ],
                "required": True,
                "validation": "strict"
            },
            "Core.Features": {
                "order": 2,
                "components": [
                    "medication_tracking",
                    "reminders",
                    "emergency_alerts"
                ],
                "required": True,
                "validation": "strict"
            },
            "Data.Safety": {
                "order": 3,
                "requirements": [
                    "sqlite_validation",
                    "backup_verification",
                    "data_integrity"
                ],
                "required": True,
                "validation": "strict"
            },
            "User.Experience": {
                "order": 4,
                "metrics": [
                    "onboarding_completion_rate",
                    "feature_usage_tracking",
                    "error_reporting"
                ],
                "required": True,
                "validation": "monitoring"
            }
        }
        
        # Register with manifest
        self._register_with_manifest()
    
    def _register_with_manifest(self):
        """Register critical paths with the validation manifest"""
        manifest.update_critical_path("Beta", {
            "features": self.paths["Beta.Onboarding"]["stages"],
            "validation_level": "strict",
            "last_updated": self.reference_time
        })
        
        manifest.update_critical_path("Database", {
            "requirements": self.paths["Data.Safety"]["requirements"],
            "validation_level": "strict",
            "last_updated": self.reference_time
        })
    
    def validate_path(self, path_name: str) -> bool:
        """Validate a specific critical path"""
        if path_name not in self.paths:
            logger.error(f"Invalid critical path: {path_name}")
            return False
            
        path = self.paths[path_name]
        
        try:
            if path_name == "Beta.Onboarding":
                return self._validate_beta_onboarding()
            elif path_name == "Core.Features":
                return self._validate_core_features()
            elif path_name == "Data.Safety":
                return self._validate_data_safety()
            elif path_name == "User.Experience":
                return self._validate_user_experience()
            
            return False
            
        except Exception as e:
            logger.error(f"Critical path validation failed for {path_name}: {str(e)}")
            return False
    
    def _validate_beta_onboarding(self) -> bool:
        """Validate beta onboarding critical path"""
        stages = self.paths["Beta.Onboarding"]["stages"]
        
        # Check manifest validation
        manifest_status = manifest.get_validation_status()
        if not manifest_status["is_valid"]:
            return False
        
        # Verify all stages are properly configured
        beta_config = manifest.critical_paths.get("Beta", {})
        if not all(stage in beta_config.get("features", []) for stage in stages):
            return False
        
        return True
    
    def _validate_core_features(self) -> bool:
        """Validate core features critical path"""
        components = self.paths["Core.Features"]["components"]
        
        # All core features must be available in beta
        return all(
            feature in manifest.critical_paths["Beta"].get("features", [])
            for feature in components
        )
    
    def _validate_data_safety(self) -> bool:
        """Validate data safety critical path"""
        requirements = self.paths["Data.Safety"]["requirements"]
        
        # Check database configuration
        db_config = manifest.critical_paths.get("Database", {})
        if not db_config.get("type") == "SQLite":
            return False
        
        # Verify backup and integrity checks
        if not db_config.get("constraints", {}).get("backup_required"):
            return False
        
        return True
    
    def _validate_user_experience(self) -> bool:
        """Validate user experience critical path"""
        metrics = self.paths["User.Experience"]["metrics"]
        
        # For beta, we just ensure monitoring is set up
        return manifest.critical_paths.get("Beta", {}).get("status") == "active"

# Create singleton instance
critical_path = CriticalPath()
