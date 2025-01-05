"""
Beta Access Control
Last Updated: 2024-12-27T22:17:18+01:00
Critical Path: Beta.Access
"""

from typing import Optional, Dict, List
from datetime import datetime
import logging
import json
from pathlib import Path
import sqlite3

from .validation_manifest import manifest
from .critical_path import critical_path
from .beta_monitoring import beta_monitoring
from .beta_backup import beta_backup

logger = logging.getLogger(__name__)

class BetaAccessManager:
    """Manages beta tester access and registration"""
    
    def __init__(self):
        self.reference_time = "2024-12-27T22:17:18+01:00"
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Initialize beta access storage"""
        db_path = Path("instance/medication_tracker.db")
        with sqlite3.connect(db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS beta_users (
                    id INTEGER PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    access_key TEXT NOT NULL,
                    status TEXT NOT NULL,
                    onboarding_stage TEXT NOT NULL,
                    registered_at TEXT NOT NULL,
                    last_access TEXT
                )
            """)
            conn.commit()
    
    async def register_beta_user(self, email: str, name: str, access_key: str) -> Dict:
        """Register a new beta user"""
        try:
            # Validate against manifest
            if not manifest.get_validation_status()["is_valid"]:
                raise ValueError("System validation failed")
            
            # Register user
            db_path = Path("instance/medication_tracker.db")
            with sqlite3.connect(db_path) as conn:
                conn.execute("""
                    INSERT INTO beta_users
                    (email, name, access_key, status, onboarding_stage, registered_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    email,
                    name,
                    access_key,
                    "active",
                    "registration",
                    self.reference_time
                ))
                conn.commit()
            
            # Track in monitoring
            await beta_monitoring.track_feature_usage(
                user_id=email,
                feature="beta_access",
                action="register",
                success=True
            )
            
            # Update manifest
            manifest.update_critical_path("Beta.Access", {
                "last_registration": self.reference_time,
                "total_users": await self._get_total_users()
            })
            
            return {
                "status": "success",
                "email": email,
                "onboarding_stage": "registration",
                "timestamp": self.reference_time
            }
            
        except sqlite3.IntegrityError:
            await beta_monitoring.track_feature_usage(
                user_id=email,
                feature="beta_access",
                action="register",
                success=False,
                error_data={"error": "Email already registered"}
            )
            raise ValueError("Email already registered")
            
        except Exception as e:
            logger.error(f"Error registering beta user: {str(e)}")
            await beta_monitoring.track_feature_usage(
                user_id=email,
                feature="beta_access",
                action="register",
                success=False,
                error_data={"error": str(e)}
            )
            raise
    
    async def validate_access(self, email: str, access_key: str) -> Dict:
        """Validate beta access"""
        try:
            db_path = Path("instance/medication_tracker.db")
            with sqlite3.connect(db_path) as conn:
                cursor = conn.execute("""
                    SELECT name, status, onboarding_stage
                    FROM beta_users
                    WHERE email = ? AND access_key = ?
                """, (email, access_key))
                result = cursor.fetchone()
                
                if not result:
                    raise ValueError("Invalid credentials")
                
                name, status, stage = result
                
                if status != "active":
                    raise ValueError("Beta access is not active")
                
                # Update last access
                conn.execute("""
                    UPDATE beta_users
                    SET last_access = ?
                    WHERE email = ?
                """, (self.reference_time, email))
                conn.commit()
            
            # Track access
            await beta_monitoring.track_feature_usage(
                user_id=email,
                feature="beta_access",
                action="validate",
                success=True
            )
            
            return {
                "status": "success",
                "email": email,
                "name": name,
                "onboarding_stage": stage,
                "timestamp": self.reference_time
            }
            
        except Exception as e:
            logger.error(f"Error validating beta access: {str(e)}")
            await beta_monitoring.track_feature_usage(
                user_id=email,
                feature="beta_access",
                action="validate",
                success=False,
                error_data={"error": str(e)}
            )
            raise
    
    async def update_onboarding_stage(self, email: str, stage: str) -> Dict:
        """Update user's onboarding stage"""
        try:
            # Validate stage
            if stage not in critical_path.paths["Beta.Onboarding"]["stages"]:
                raise ValueError(f"Invalid onboarding stage: {stage}")
            
            db_path = Path("instance/medication_tracker.db")
            with sqlite3.connect(db_path) as conn:
                conn.execute("""
                    UPDATE beta_users
                    SET onboarding_stage = ?
                    WHERE email = ?
                """, (stage, email))
                conn.commit()
            
            # Track progress
            await beta_monitoring.track_onboarding_progress(
                user_id=email,
                stage=stage
            )
            
            return {
                "status": "success",
                "email": email,
                "onboarding_stage": stage,
                "timestamp": self.reference_time
            }
            
        except Exception as e:
            logger.error(f"Error updating onboarding stage: {str(e)}")
            raise
    
    async def _get_total_users(self) -> int:
        """Get total number of beta users"""
        db_path = Path("instance/medication_tracker.db")
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM beta_users")
            return cursor.fetchone()[0]

# Create singleton instance
beta_access = BetaAccessManager()
