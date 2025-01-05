"""
Beta Environment Startup Validation
Last Updated: 2024-12-27T22:13:11+01:00
Critical Path: Beta.Startup
"""

from pathlib import Path
import sqlite3
from typing import Dict
from .validation_manifest import manifest
from .critical_path import critical_path
from .beta_monitoring import beta_monitoring
from .beta_backup import beta_backup
from .validation_report import validation_report
import logging

logger = logging.getLogger(__name__)

class BetaStartup:
    """Validates and prepares beta testing environment"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T22:13:11+01:00"
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        dirs = [
            Path("instance"),
            Path("instance/backups"),
            Path("instance/validation_reports"),
            Path("instance/evidence")
        ]
        for dir_path in dirs:
            dir_path.mkdir(exist_ok=True)
    
    async def validate_environment(self) -> Dict:
        """Validate beta environment before startup"""
        try:
            results = {
                "database": await self._validate_database(),
                "critical_paths": await self._validate_critical_paths(),
                "monitoring": await self._validate_monitoring(),
                "backup": await self._validate_backup(),
                "timestamp": self.reference_time
            }
            
            # Update manifest with startup status
            manifest.update_critical_path("Beta.Startup", {
                "status": "ready" if all(results.values()) else "failed",
                "last_check": self.reference_time,
                "validation_results": results
            })
            
            return results
            
        except Exception as e:
            logger.error(f"Beta environment validation failed: {str(e)}")
            raise
    
    async def _validate_database(self) -> bool:
        """Validate database setup"""
        try:
            db_path = Path("instance/medication_tracker.db")
            
            # Ensure database exists
            if not db_path.exists():
                return False
            
            # Validate schema
            with sqlite3.connect(db_path) as conn:
                # Check required tables
                tables = [
                    "beta_monitoring",
                    "feature_usage",
                    "beta_backups"
                ]
                
                for table in tables:
                    result = conn.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                        (table,)
                    ).fetchone()
                    
                    if not result:
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Database validation failed: {str(e)}")
            return False
    
    async def _validate_critical_paths(self) -> bool:
        """Validate all critical paths"""
        try:
            paths = [
                "Beta.Onboarding",
                "Core.Features",
                "Data.Safety",
                "User.Experience"
            ]
            
            return all(critical_path.validate_path(path) for path in paths)
            
        except Exception as e:
            logger.error(f"Critical path validation failed: {str(e)}")
            return False
    
    async def _validate_monitoring(self) -> bool:
        """Validate monitoring system"""
        try:
            # Ensure monitoring tables are ready
            db_path = Path("instance/medication_tracker.db")
            with sqlite3.connect(db_path) as conn:
                result = conn.execute("""
                    SELECT COUNT(*) FROM beta_monitoring
                    WHERE event_type = 'startup_check'
                    AND timestamp > ?
                """, (self.reference_time,)).fetchone()
                
            if not result or result[0] == 0:
                # Record startup check
                beta_monitoring._record_event(
                    user_id="system",
                    event_type="startup_check",
                    event_data={"status": "validated"},
                    priority=beta_monitoring.MonitoringPriority.HIGH
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Monitoring validation failed: {str(e)}")
            return False
    
    async def _validate_backup(self) -> bool:
        """Validate backup system"""
        try:
            backup_dir = Path("instance/backups")
            if not backup_dir.exists():
                return False
            
            # Ensure we can write to backup directory
            test_file = backup_dir / "test_write"
            try:
                test_file.touch()
                test_file.unlink()
            except Exception:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Backup validation failed: {str(e)}")
            return False

# Create singleton instance
beta_startup = BetaStartup()
