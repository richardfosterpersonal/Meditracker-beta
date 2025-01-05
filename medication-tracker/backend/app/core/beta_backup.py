"""
Beta Backup System
Last Updated: 2024-12-27T22:04:25+01:00
Critical Path: Beta.Backup
"""

from pathlib import Path
import shutil
import json
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, create_engine
from sqlalchemy.orm import Session, relationship
from app.database import Base, get_db
from .validation_manifest import manifest
from .critical_path import critical_path
from .beta_monitoring import beta_monitoring
import logging

logger = logging.getLogger(__name__)

class BetaBackupRecord(Base):
    """Beta backup record"""
    __tablename__ = 'beta_backups'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), nullable=False)
    backup_path = Column(String(255), nullable=False)
    backup_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

class BetaBackup:
    """Manages backups for beta testing data"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T22:04:25+01:00"
        self.backup_dir = Path("instance/backups")
        self.backup_dir.mkdir(exist_ok=True)
        self.db = next(get_db())
        
    async def create_backup(self, user_id: str, backup_type: str = "manual") -> Dict:
        """Create a new backup for beta user data"""
        try:
            # Generate backup path
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"beta_{user_id}_{timestamp}.zip"
            
            # Create backup
            shutil.make_archive(
                str(backup_path.with_suffix("")),
                'zip',
                "instance/beta_data"
            )
            
            # Record backup
            backup = BetaBackupRecord(
                user_id=user_id,
                backup_path=str(backup_path),
                backup_type=backup_type,
                status="created",
                metadata={
                    "size": backup_path.stat().st_size,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            
            self.db.add(backup)
            self.db.commit()
            
            return {
                "success": True,
                "backup_id": backup.id,
                "backup_path": str(backup_path),
                "timestamp": backup.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    async def verify_backup(self, user_id: str, backup_path: str) -> Dict:
        """Verify backup integrity"""
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                raise FileNotFoundError(f"Backup file not found: {backup_path}")
                
            # Get backup record
            backup = (
                self.db.query(BetaBackupRecord)
                .filter(
                    BetaBackupRecord.user_id == user_id,
                    BetaBackupRecord.backup_path == backup_path
                )
                .first()
            )
            
            if not backup:
                raise ValueError(f"No backup record found for path: {backup_path}")
                
            # Verify backup size
            current_size = backup_file.stat().st_size
            recorded_size = backup.metadata.get("size")
            
            if current_size != recorded_size:
                backup.status = "corrupted"
                self.db.commit()
                
                return {
                    "success": False,
                    "error": "Backup file size mismatch",
                    "details": {
                        "current_size": current_size,
                        "recorded_size": recorded_size
                    }
                }
                
            # Update status
            backup.status = "verified"
            backup.metadata["verified_at"] = datetime.utcnow().isoformat()
            self.db.commit()
            
            return {
                "success": True,
                "backup_id": backup.id,
                "status": "verified",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to verify backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    async def get_user_backups(self, user_id: str) -> Dict:
        """Get all backups for a user"""
        try:
            backups = (
                self.db.query(BetaBackupRecord)
                .filter(BetaBackupRecord.user_id == user_id)
                .order_by(BetaBackupRecord.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "user_id": user_id,
                "backup_count": len(backups),
                "backups": [
                    {
                        "backup_id": backup.id,
                        "backup_path": backup.backup_path,
                        "backup_type": backup.backup_type,
                        "status": backup.status,
                        "metadata": backup.metadata,
                        "timestamp": backup.timestamp.isoformat()
                    }
                    for backup in backups
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get user backups: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

# Create singleton instance
beta_backup = BetaBackup()
