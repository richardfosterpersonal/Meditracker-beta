"""
Validation Manifest
Last Updated: 2024-12-27T21:47:57+01:00
Critical Path: Core.Validation
"""

from datetime import datetime
from typing import Dict, Any, List
import json
import logging
from pathlib import Path

class ValidationManifest:
    """Single source of truth for system validation"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T21:47:57+01:00"
        self.critical_paths = {
            "Database": {
                "type": "SQLite",
                "validated_at": self.reference_time,
                "validation_status": "pending",
                "constraints": {
                    "beta_testing": True,
                    "multi_user": False,
                    "backup_required": True
                }
            },
            "Beta": {
                "stage": "testing",
                "validated_at": self.reference_time,
                "features": ["registration", "medication_tracking", "notifications"]
            }
        }
        self._validation_status = self._initialize_validation()
        
    def _initialize_validation(self) -> Dict[str, Any]:
        return {
            "is_valid": False,
            "last_checked": self.reference_time,
            "critical_paths": self.critical_paths
        }
    
    def validate_critical_path(self) -> bool:
        """Validate all critical paths"""
        try:
            # Validate database configuration
            db_status = self._validate_database_path()
            
            # Update validation status
            self._validation_status.update({
                "is_valid": all([db_status]),
                "last_checked": self.reference_time,
                "database": {
                    "status": "valid" if db_status else "invalid",
                    "timestamp": self.reference_time
                }
            })
            
            # Write validation evidence
            self._write_validation_evidence()
            
            return self._validation_status["is_valid"]
            
        except Exception as e:
            logging.error(f"Critical path validation failed: {str(e)}")
            return False
    
    def _validate_database_path(self) -> bool:
        """Validate database configuration against manifest"""
        db_config = self.critical_paths["Database"]
        
        # For beta testing, enforce SQLite
        if db_config["constraints"]["beta_testing"]:
            from ..infrastructure.persistence.database import Database
            db = Database()
            current_url = str(db.engine.url)
            
            is_valid = (
                "sqlite" in current_url.lower() and
                db_config["type"] == "SQLite" and
                not db_config["constraints"]["multi_user"]
            )
            
            if not is_valid:
                logging.error(f"Database validation failed: {current_url}")
            
            return is_valid
        
        return True
    
    def _write_validation_evidence(self):
        """Write validation evidence to file"""
        evidence_path = Path(__file__).parent / "validation_evidence"
        evidence_path.mkdir(exist_ok=True)
        
        evidence_file = evidence_path / f"validation_{self.reference_time.replace(':', '-')}.json"
        with open(evidence_file, 'w') as f:
            json.dump(self._validation_status, f, indent=2)
    
    def get_validation_status(self) -> Dict[str, Any]:
        """Get current validation status"""
        return self._validation_status
    
    def update_critical_path(self, path: str, data: Dict[str, Any]) -> bool:
        """Update critical path data"""
        if path in self.critical_paths:
            data["validated_at"] = self.reference_time
            self.critical_paths[path].update(data)
            return self.validate_critical_path()
        return False

manifest = ValidationManifest()
