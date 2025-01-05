"""
Beta User Management System
Manages beta users, their access levels, and feedback
Last Updated: 2025-01-01T21:47:34+01:00
"""

from typing import Dict, List, Optional, Set
from enum import Enum
import json
import asyncio
from datetime import datetime
import logging
from pathlib import Path
import uuid

from .pre_validation_requirements import (
    PreValidationRequirement,
    BetaValidationStatus,
    BetaValidationPriority,
    BetaValidationType,
    BetaValidationScope,
    BetaValidationResult
)
from .beta_feature_flags import BetaFeatureStatus

logger = logging.getLogger(__name__)

class BetaUserStatus(Enum):
    """Status of beta users"""
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"

class BetaUserTier(Enum):
    """Beta user access tiers"""
    ALPHA = "alpha"  # Internal testing
    BETA_LIMITED = "beta_limited"  # Early access
    BETA_FULL = "beta_full"  # Full beta access
    BETA_PLUS = "beta_plus"  # Advanced beta features

class BetaUser:
    """Represents a beta user with their configuration"""
    
    def __init__(
        self,
        user_id: str,
        email: str,
        tier: BetaUserTier,
        status: BetaUserStatus = BetaUserStatus.PENDING,
        allowed_features: Optional[Set[str]] = None,
        metrics_opt_in: bool = True,
        feedback_opt_in: bool = True
    ):
        self.user_id = user_id
        self.email = email
        self.tier = tier
        self.status = status
        self.allowed_features = allowed_features or set()
        self.metrics_opt_in = metrics_opt_in
        self.feedback_opt_in = feedback_opt_in
        self.created_at = datetime.utcnow().isoformat()
        self.last_active = self.created_at
        self.feedback_count = 0
        self.bug_reports = 0
        self.feature_usage: Dict[str, int] = {}

class BetaUserManager:
    """Manages beta users and their access"""
    
    def __init__(self):
        self.users: Dict[str, BetaUser] = {}
        self._lock = asyncio.Lock()
        self.config_path = Path("config/beta_users.json")
        self.load_users()
        
    def load_users(self) -> None:
        """Load user configurations from file"""
        try:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    data = json.load(f)
                    for user_data in data["users"]:
                        user = BetaUser(
                            user_id=user_data["user_id"],
                            email=user_data["email"],
                            tier=BetaUserTier(user_data["tier"]),
                            status=BetaUserStatus(user_data["status"]),
                            allowed_features=set(user_data.get("allowed_features", [])),
                            metrics_opt_in=user_data.get("metrics_opt_in", True),
                            feedback_opt_in=user_data.get("feedback_opt_in", True)
                        )
                        user.created_at = user_data["created_at"]
                        user.last_active = user_data["last_active"]
                        user.feedback_count = user_data.get("feedback_count", 0)
                        user.bug_reports = user_data.get("bug_reports", 0)
                        user.feature_usage = user_data.get("feature_usage", {})
                        self.users[user.user_id] = user
        except Exception as e:
            logger.error(f"Failed to load beta users: {str(e)}")
            raise
            
    async def save_users(self) -> None:
        """Save user configurations to file"""
        async with self._lock:
            try:
                self.config_path.parent.mkdir(parents=True, exist_ok=True)
                data = {
                    "last_updated": datetime.utcnow().isoformat(),
                    "users": [
                        {
                            "user_id": user.user_id,
                            "email": user.email,
                            "tier": user.tier.value,
                            "status": user.status.value,
                            "allowed_features": list(user.allowed_features),
                            "metrics_opt_in": user.metrics_opt_in,
                            "feedback_opt_in": user.feedback_opt_in,
                            "created_at": user.created_at,
                            "last_active": user.last_active,
                            "feedback_count": user.feedback_count,
                            "bug_reports": user.bug_reports,
                            "feature_usage": user.feature_usage
                        }
                        for user in self.users.values()
                    ]
                }
                
                with open(self.config_path, "w") as f:
                    json.dump(data, f, indent=2)
                    
            except Exception as e:
                logger.error(f"Failed to save beta users: {str(e)}")
                raise
                
    async def register_user(
        self,
        email: str,
        tier: BetaUserTier = BetaUserTier.BETA_LIMITED
    ) -> BetaUser:
        """Register a new beta user"""
        async with self._lock:
            # Check if email already registered
            for user in self.users.values():
                if user.email == email:
                    raise ValueError(f"Email {email} already registered")
                    
            user = BetaUser(
                user_id=str(uuid.uuid4()),
                email=email,
                tier=tier
            )
            
            self.users[user.user_id] = user
            await self.save_users()
            return user
            
    async def approve_user(self, user_id: str) -> None:
        """Approve a pending beta user"""
        async with self._lock:
            if user_id not in self.users:
                raise ValueError(f"User {user_id} not found")
                
            user = self.users[user_id]
            if user.status != BetaUserStatus.PENDING:
                raise ValueError(f"User {user_id} is not pending approval")
                
            user.status = BetaUserStatus.APPROVED
            await self.save_users()
            
    async def activate_user(self, user_id: str) -> None:
        """Activate an approved beta user"""
        async with self._lock:
            if user_id not in self.users:
                raise ValueError(f"User {user_id} not found")
                
            user = self.users[user_id]
            if user.status != BetaUserStatus.APPROVED:
                raise ValueError(f"User {user_id} is not approved")
                
            user.status = BetaUserStatus.ACTIVE
            await self.save_users()
            
    async def update_user(self, user_id: str, **kwargs) -> None:
        """Update a beta user's configuration"""
        async with self._lock:
            if user_id not in self.users:
                raise ValueError(f"User {user_id} not found")
                
            user = self.users[user_id]
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
                    
            user.last_active = datetime.utcnow().isoformat()
            await self.save_users()
            
    async def record_feature_usage(self, user_id: str, feature_name: str) -> None:
        """Record feature usage for a beta user"""
        async with self._lock:
            if user_id not in self.users:
                raise ValueError(f"User {user_id} not found")
                
            user = self.users[user_id]
            user.feature_usage[feature_name] = user.feature_usage.get(feature_name, 0) + 1
            user.last_active = datetime.utcnow().isoformat()
            await self.save_users()
            
    async def record_feedback(self, user_id: str, is_bug_report: bool = False) -> None:
        """Record user feedback or bug report"""
        async with self._lock:
            if user_id not in self.users:
                raise ValueError(f"User {user_id} not found")
                
            user = self.users[user_id]
            if is_bug_report:
                user.bug_reports += 1
            else:
                user.feedback_count += 1
                
            user.last_active = datetime.utcnow().isoformat()
            await self.save_users()
            
    def can_access_feature(self, user_id: str, feature_name: str) -> bool:
        """Check if a user can access a specific feature"""
        if user_id not in self.users:
            return False
            
        user = self.users[user_id]
        
        # Check user status
        if user.status not in {BetaUserStatus.ACTIVE, BetaUserStatus.APPROVED}:
            return False
            
        # Check specific feature access
        if feature_name in user.allowed_features:
            return True
            
        # Check tier-based access
        feature_tiers = {
            BetaFeatureStatus.ALPHA: {BetaUserTier.ALPHA},
            BetaFeatureStatus.BETA_LIMITED: {BetaUserTier.ALPHA, BetaUserTier.BETA_LIMITED, BetaUserTier.BETA_PLUS},
            BetaFeatureStatus.BETA_FULL: {BetaUserTier.ALPHA, BetaUserTier.BETA_LIMITED, BetaUserTier.BETA_FULL, BetaUserTier.BETA_PLUS}
        }
        
        # TODO: Get feature status from feature flag system
        feature_status = BetaFeatureStatus.BETA_LIMITED
        allowed_tiers = feature_tiers.get(feature_status, set())
        
        return user.tier in allowed_tiers
        
    async def validate_user_management(self) -> BetaValidationResult:
        """Validate beta user management system"""
        try:
            # Check user data integrity
            for user in self.users.values():
                if not all([user.user_id, user.email, user.tier, user.status]):
                    return BetaValidationResult(
                        requirement=PreValidationRequirement.BETA_USER_MANAGEMENT_READY,
                        status=BetaValidationStatus.FAILED,
                        priority=BetaValidationPriority.CRITICAL,
                        validation_type=BetaValidationType.USER_MANAGEMENT,
                        scope=BetaValidationScope.USER,
                        message=f"Invalid user data for user {user.user_id}",
                        timestamp=datetime.utcnow().isoformat(),
                        corrective_action="Fix corrupted user data"
                    )
                    
            # Check configuration file
            if not self.config_path.exists():
                return BetaValidationResult(
                    requirement=PreValidationRequirement.BETA_USER_MANAGEMENT_READY,
                    status=BetaValidationStatus.FAILED,
                    priority=BetaValidationPriority.HIGH,
                    validation_type=BetaValidationType.USER_MANAGEMENT,
                    scope=BetaValidationScope.SYSTEM,
                    message="Beta user configuration file not found",
                    timestamp=datetime.utcnow().isoformat(),
                    corrective_action="Create beta user configuration file"
                )
                
            return BetaValidationResult(
                requirement=PreValidationRequirement.BETA_USER_MANAGEMENT_READY,
                status=BetaValidationStatus.PASSED,
                priority=BetaValidationPriority.HIGH,
                validation_type=BetaValidationType.USER_MANAGEMENT,
                scope=BetaValidationScope.SYSTEM,
                message="Beta user management validation passed",
                timestamp=datetime.utcnow().isoformat()
            )
            
        except Exception as e:
            return BetaValidationResult(
                requirement=PreValidationRequirement.BETA_USER_MANAGEMENT_READY,
                status=BetaValidationStatus.FAILED,
                priority=BetaValidationPriority.CRITICAL,
                validation_type=BetaValidationType.USER_MANAGEMENT,
                scope=BetaValidationScope.SYSTEM,
                message=f"Beta user management validation failed: {str(e)}",
                timestamp=datetime.utcnow().isoformat(),
                corrective_action="Fix beta user management system error"
            )
