from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from enum import Enum

class BetaUserStatus(Enum):
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    COMPLETED = "completed"

class BetaFeatureAccess(Enum):
    CORE = "core"
    EXTENDED = "extended"
    FULL = "full"

@dataclass
class BetaValidation:
    """Tracks validation requirements for beta users"""
    user_id: str
    completed_validations: List[str]  # List of completed VALIDATION-* requirements
    pending_validations: List[str]    # List of pending VALIDATION-* requirements
    last_validation_date: datetime
    validation_notes: Optional[str] = None

@dataclass
class BetaUser:
    """Beta user entity with validation tracking"""
    id: str
    email: str
    name: str
    status: BetaUserStatus
    feature_access: BetaFeatureAccess
    created_at: datetime
    last_active: datetime
    validation: BetaValidation
    feedback_count: int = 0
    reported_issues: int = 0
    
    def validate_access(self, feature: str) -> bool:
        """Validate if user has access to specific feature"""
        if self.status != BetaUserStatus.ACTIVE:
            return False
            
        access_levels = {
            BetaFeatureAccess.CORE: ["medication_tracking", "reminders"],
            BetaFeatureAccess.EXTENDED: ["medication_tracking", "reminders", "interactions", "reports"],
            BetaFeatureAccess.FULL: ["medication_tracking", "reminders", "interactions", "reports", "emergency"]
        }
        
        return feature in access_levels[self.feature_access]
    
    def update_validation_status(self, validation_code: str, completed: bool = True) -> None:
        """Update validation status for specific requirement"""
        if completed:
            if validation_code in self.validation.pending_validations:
                self.validation.pending_validations.remove(validation_code)
                self.validation.completed_validations.append(validation_code)
        else:
            if validation_code in self.validation.completed_validations:
                self.validation.completed_validations.remove(validation_code)
                self.validation.pending_validations.append(validation_code)
        
        self.validation.last_validation_date = datetime.utcnow()
    
    def is_compliant(self) -> bool:
        """Check if user meets all required validations"""
        required_validations = [
            "VALIDATION-MED-001",  # Drug interaction validation
            "VALIDATION-MED-002",  # Real-time safety alerts
            "VALIDATION-SEC-001",  # HIPAA compliance
            "VALIDATION-SEC-002"   # PHI protection
        ]
        
        return all(v in self.validation.completed_validations for v in required_validations)
