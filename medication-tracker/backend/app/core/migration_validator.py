"""
Migration Validator
Validates database migration environment and operations
Last Updated: 2025-01-01T19:55:16+01:00
"""

from datetime import datetime
import logging
from pathlib import Path
import sys
from typing import Dict, List, Optional
import subprocess
import asyncio

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

from .hooks.validation_hooks import ValidationEvent
from .validation_service import ValidationService
from .service_migration_orchestrator import ServiceMigrationOrchestrator
from ..infrastructure.notification.notification_handler import NotificationHandler
from ..infrastructure.persistence.database import Database
from ..settings import Settings

class MigrationValidator:
    """Validates database migration environment and operations"""
    
    def __init__(self):
        self.validation_service = ValidationService()
        self.migration_orchestrator = ServiceMigrationOrchestrator()
        self.notification = NotificationHandler()
        self.database = Database()
        self.logger = logging.getLogger(__name__)
        
    async def validate_migration_environment(self) -> Dict:
        """Validate that the migration environment is properly set up"""
        try:
            # Check Python version
            python_version = sys.version_info
            if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 7):
                return {
                    "valid": False,
                    "error": "Invalid Python version",
                    "details": f"Python 3.7+ required, found {python_version.major}.{python_version.minor}"
                }
                
            # Check alembic installation
            try:
                import alembic
                alembic_version = alembic.__version__
            except ImportError:
                return {
                    "valid": False,
                    "error": "Alembic not installed",
                    "details": "Please install alembic: pip install alembic"
                }
                
            # Check configuration files
            alembic_ini = Path("alembic.ini")
            if not alembic_ini.exists():
                return {
                    "valid": False,
                    "error": "Missing alembic.ini",
                    "details": "alembic.ini configuration file not found"
                }
                
            migrations_dir = Path("migrations")
            if not migrations_dir.exists() or not migrations_dir.is_dir():
                return {
                    "valid": False,
                    "error": "Missing migrations directory",
                    "details": "migrations directory not found"
                }
                
            # Check database connection
            try:
                engine = create_engine(Settings.DATABASE_URL)
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
            except Exception as e:
                return {
                    "valid": False,
                    "error": "Database connection failed",
                    "details": str(e)
                }
                
            # Check if we can import SQLAlchemy models
            try:
                from ..models import Base
            except ImportError:
                return {
                    "valid": False,
                    "error": "SQLAlchemy models not found",
                    "details": "Unable to import SQLAlchemy Base"
                }
                
            # Validate alembic history
            config = Config("alembic.ini")
            script = ScriptDirectory.from_config(config)
            
            # Check if we have any pending migrations
            head_revision = script.get_current_head()
            if not head_revision:
                return {
                    "valid": False,
                    "error": "No migration history",
                    "details": "No migration versions found"
                }
                
            return {
                "valid": True,
                "python_version": f"{python_version.major}.{python_version.minor}",
                "alembic_version": alembic_version,
                "head_revision": head_revision,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Migration environment validation failed: {e}")
            return {
                "valid": False,
                "error": "Migration environment validation failed",
                "details": str(e)
            }
            
    async def validate_migration_safety(self, migration_script: str) -> Dict:
        """Validate that a migration is safe to run"""
        try:
            # Read migration script
            script_path = Path("migrations/versions") / migration_script
            if not script_path.exists():
                return {
                    "valid": False,
                    "error": "Migration script not found",
                    "details": f"Script {migration_script} does not exist"
                }
                
            # Parse script content
            content = script_path.read_text()
            
            # Check for dangerous operations
            dangerous_ops = [
                "op.drop_table",
                "op.drop_column",
                "op.alter_column",
                "op.drop_constraint",
                "op.drop_index"
            ]
            
            found_dangers = []
            for op in dangerous_ops:
                if op in content:
                    found_dangers.append(op)
                    
            if found_dangers:
                return {
                    "valid": False,
                    "error": "Dangerous migration operations detected",
                    "details": {
                        "operations": found_dangers,
                        "warning": "These operations may cause data loss"
                    }
                }
                
            return {
                "valid": True,
                "script": migration_script,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Migration safety validation failed: {e}")
            return {
                "valid": False,
                "error": "Migration safety validation failed",
                "details": str(e)
            }
            
    async def run_migration(self, revision: str = "head") -> Dict:
        """Run database migration after validation"""
        try:
            # First validate environment
            env_validation = await self.validate_migration_environment()
            if not env_validation["valid"]:
                return env_validation
                
            # If running specific revision, validate its safety
            if revision != "head":
                safety_check = await self.validate_migration_safety(revision)
                if not safety_check["valid"]:
                    return safety_check
                    
            # Run migration using Python module
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", revision],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Notify success
            await self.notification.send_validation_success(
                title="Database Migration Successful",
                details={
                    "revision": revision,
                    "output": result.stdout
                }
            )
            
            return {
                "success": True,
                "revision": revision,
                "output": result.stdout,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except subprocess.CalledProcessError as e:
            error_details = {
                "success": False,
                "error": "Migration failed",
                "output": e.stdout,
                "error_output": e.stderr
            }
            
            # Notify failure
            await self.notification.send_validation_alert(
                title="Database Migration Failed",
                details=error_details
            )
            
            return error_details
            
        except Exception as e:
            error_details = {
                "success": False,
                "error": "Migration failed",
                "details": str(e)
            }
            
            # Notify failure
            await self.notification.send_validation_alert(
                title="Database Migration Failed",
                details=error_details
            )
            
            return error_details
