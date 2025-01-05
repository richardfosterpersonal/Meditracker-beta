"""
Beta User Management System
Critical Path: BETA-USER-MANAGER-*
Last Updated: 2025-01-02T12:43:13+01:00

Manages beta users and their permissions.
"""

import logging
from typing import Dict, List, Optional, Set
from datetime import datetime
import json
from pathlib import Path
import asyncio

from backend.app.exceptions import BetaUserError
from .validation_types import ValidationResult

logger = logging.getLogger(__name__)

class BetaUserManager:
    """Manages beta users and their permissions"""
    
    def __init__(self):
        """Initialize beta user manager"""
        self.users: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
        self.config_path = Path("config/beta_users.json")
        self.load_users()
        
    def load_users(self):
        """Load user configurations from file"""
        try:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    self.users = json.load(f)
                logger.info(f"Loaded {len(self.users)} beta users")
            else:
                logger.warning("Beta users config file not found")
                self.users = {}
        except Exception as e:
            logger.error(f"Failed to load beta users: {str(e)}")
            raise BetaUserError("Failed to load beta users") from e
            
    def save_users(self):
        """Save user configurations to file"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.users, f, indent=2)
            logger.info("Saved beta users configuration")
        except Exception as e:
            logger.error(f"Failed to save beta users: {str(e)}")
            raise BetaUserError("Failed to save beta users") from e
            
    async def add_user(self, user_id: str, permissions: Set[str]):
        """Add a new beta user"""
        async with self._lock:
            if user_id in self.users:
                raise BetaUserError(f"User {user_id} already exists")
                
            self.users[user_id] = {
                "permissions": list(permissions),
                "created_at": datetime.utcnow().isoformat(),
                "last_active": None,
                "feature_access": [],
                "validation_status": "pending"
            }
            self.save_users()
            logger.info(f"Added beta user: {user_id}")
            
    async def remove_user(self, user_id: str):
        """Remove a beta user"""
        async with self._lock:
            if user_id not in self.users:
                raise BetaUserError(f"User {user_id} not found")
                
            del self.users[user_id]
            self.save_users()
            logger.info(f"Removed beta user: {user_id}")
            
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user information"""
        return self.users.get(user_id)
        
    def has_permission(self, user_id: str, permission: str) -> bool:
        """Check if user has a specific permission"""
        user = self.get_user(user_id)
        return user is not None and permission in user.get("permissions", [])
