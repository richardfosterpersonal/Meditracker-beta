from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from .entities import BetaUser, BetaUserStatus, BetaFeatureAccess

class BetaUserRepository(ABC):
    """Repository interface for beta user management"""
    
    @abstractmethod
    async def create_beta_user(self, user: BetaUser) -> BetaUser:
        """Create a new beta user"""
        pass
    
    @abstractmethod
    async def get_beta_user(self, user_id: str) -> Optional[BetaUser]:
        """Retrieve a beta user by ID"""
        pass
    
    @abstractmethod
    async def update_beta_user(self, user: BetaUser) -> BetaUser:
        """Update beta user information"""
        pass
    
    @abstractmethod
    async def list_beta_users(self, status: Optional[BetaUserStatus] = None) -> List[BetaUser]:
        """List all beta users, optionally filtered by status"""
        pass
    
    @abstractmethod
    async def update_validation_status(self, user_id: str, validation_code: str, completed: bool) -> BetaUser:
        """Update validation status for a specific requirement"""
        pass
    
    @abstractmethod
    async def get_validation_metrics(self) -> dict:
        """Get metrics about validation completion across all beta users"""
        pass
    
    @abstractmethod
    async def get_non_compliant_users(self) -> List[BetaUser]:
        """Get list of users not meeting validation requirements"""
        pass
    
    @abstractmethod
    async def record_feedback(self, user_id: str) -> None:
        """Record that a user has provided feedback"""
        pass
    
    @abstractmethod
    async def record_issue(self, user_id: str) -> None:
        """Record that a user has reported an issue"""
        pass
    
    @abstractmethod
    async def get_active_validations(self) -> List[str]:
        """Get list of all active validation requirements"""
        return [
            "VALIDATION-MED-001",  # Drug interaction validation
            "VALIDATION-MED-002",  # Real-time safety alerts
            "VALIDATION-MED-003",  # Emergency protocol execution
            "VALIDATION-SEC-001",  # HIPAA compliance
            "VALIDATION-SEC-002",  # PHI protection
            "VALIDATION-SEC-003",  # Complete audit trails
            "VALIDATION-SYS-001",  # 99.9% uptime
            "VALIDATION-SYS-002",  # <100ms response time
            "VALIDATION-SYS-003"   # Zero data loss
        ]
