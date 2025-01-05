"""
Validation Report Generator
Last Updated: 2024-12-27T22:08:38+01:00
Critical Path: Beta.Validation.Reports
"""

from pathlib import Path
import json
from typing import Dict, List
from datetime import datetime
import sqlite3
from .validation_manifest import manifest
from .critical_path import critical_path
from .beta_monitoring import beta_monitoring
from .beta_backup import beta_backup
import logging

logger = logging.getLogger(__name__)

class ValidationReport:
    """Generates comprehensive validation reports for beta testing"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T22:08:38+01:00"
        self.reports_dir = Path("instance/validation_reports")
        self.reports_dir.mkdir(exist_ok=True)
    
    async def generate_beta_report(self, user_id: str) -> Dict:
        """Generate comprehensive beta validation report"""
        try:
            # Get critical path status
            critical_status = {
                path: critical_path.validate_path(path)
                for path in critical_path.paths.keys()
            }
            
            # Get manifest validation
            manifest_status = manifest.get_validation_status()
            
            # Get completed stages
            completed_stages = await beta_monitoring._get_completed_stages(user_id)
            
            # Get feature usage
            feature_usage = await self._get_feature_usage(user_id)
            
            # Get backup status
            backup_status = await self._get_backup_status(user_id)
            
            # Compile report
            report = {
                "timestamp": self.reference_time,
                "user_id": user_id,
                "critical_path_status": critical_status,
                "manifest_validation": manifest_status,
                "onboarding_progress": {
                    "completed_stages": completed_stages,
                    "remaining_stages": [
                        stage for stage in critical_path.paths["Beta.Onboarding"]["stages"]
                        if stage not in completed_stages
                    ]
                },
                "feature_usage": feature_usage,
                "data_safety": {
                    "backups": backup_status,
                    "database_type": manifest.critical_paths["Database"]["type"],
                    "safety_validated": critical_status["Data.Safety"]
                }
            }
            
            # Save report
            report_file = self.reports_dir / f"validation_report_{user_id}_{self.reference_time.replace(':', '-')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate validation report: {str(e)}")
            raise
    
    async def _get_feature_usage(self, user_id: str) -> Dict:
        """Get feature usage statistics"""
        db_path = Path("instance/medication_tracker.db")
        with sqlite3.connect(db_path) as conn:
            # Get successful feature usage
            cursor = conn.execute("""
                SELECT feature, COUNT(*) as count
                FROM feature_usage
                WHERE user_id = ? AND success = 1
                GROUP BY feature
            """, (user_id,))
            successes = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Get feature errors
            cursor = conn.execute("""
                SELECT feature, COUNT(*) as count
                FROM feature_usage
                WHERE user_id = ? AND success = 0
                GROUP BY feature
            """, (user_id,))
            errors = {row[0]: row[1] for row in cursor.fetchall()}
            
            return {
                "successes": successes,
                "errors": errors,
                "total_actions": sum(successes.values()) + sum(errors.values())
            }
    
    async def _get_backup_status(self, user_id: str) -> List[Dict]:
        """Get backup history and status"""
        db_path = Path("instance/medication_tracker.db")
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("""
                SELECT backup_path, backup_type, status, metadata, timestamp
                FROM beta_backups
                WHERE user_id = ?
                ORDER BY timestamp DESC
            """, (user_id,))
            
            return [{
                "backup_path": row[0],
                "type": row[1],
                "status": row[2],
                "metadata": json.loads(row[3]),
                "timestamp": row[4]
            } for row in cursor.fetchall()]

# Create singleton instance
validation_report = ValidationReport()
