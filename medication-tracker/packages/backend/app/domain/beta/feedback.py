from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum

class FeedbackType(Enum):
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    USABILITY = "usability"
    PERFORMANCE = "performance"
    SECURITY = "security"
    VALIDATION = "validation"
    OTHER = "other"

class FeedbackPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FeedbackStatus(Enum):
    NEW = "new"
    UNDER_REVIEW = "under_review"
    VALIDATED = "validated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"

@dataclass
class ValidationReference:
    """Links feedback to specific validation requirements"""
    validation_code: str  # e.g., VALIDATION-MED-001
    impact_level: str    # high, medium, low
    description: str
    affected_components: List[str]

@dataclass
class BetaFeedback:
    """Structured feedback from beta users with validation tracking"""
    id: str
    user_id: str
    type: FeedbackType
    priority: FeedbackPriority
    status: FeedbackStatus
    title: str
    description: str
    created_at: datetime
    updated_at: datetime
    validation_references: List[ValidationReference]
    affected_features: List[str]
    metrics: Dict[str, float]  # Performance metrics if applicable
    screenshots: List[str]     # Paths to attached screenshots
    system_info: Dict[str, str]  # System information at time of feedback
    resolution: Optional[str] = None
    assigned_to: Optional[str] = None
    
    def is_validation_critical(self) -> bool:
        """Check if feedback affects critical validation requirements"""
        critical_validations = {
            "VALIDATION-MED-001",  # Drug interaction validation
            "VALIDATION-MED-002",  # Real-time safety alerts
            "VALIDATION-SEC-001",  # HIPAA compliance
            "VALIDATION-SEC-002"   # PHI protection
        }
        return any(ref.validation_code in critical_validations 
                  for ref in self.validation_references)
    
    def requires_immediate_attention(self) -> bool:
        """Determine if feedback requires immediate attention"""
        return (
            self.priority == FeedbackPriority.CRITICAL or
            self.is_validation_critical() or
            self.type in {FeedbackType.SECURITY, FeedbackType.VALIDATION} or
            any(ref.impact_level == "high" for ref in self.validation_references)
        )
    
    def get_affected_validations(self) -> List[str]:
        """Get list of affected validation requirements"""
        return [ref.validation_code for ref in self.validation_references]
    
    def update_status(self, new_status: FeedbackStatus, resolution: Optional[str] = None) -> None:
        """Update feedback status and resolution"""
        self.status = new_status
        if resolution:
            self.resolution = resolution
        self.updated_at = datetime.utcnow()

@dataclass
class FeedbackMetrics:
    """Aggregated metrics for beta feedback"""
    total_feedback: int
    feedback_by_type: Dict[FeedbackType, int]
    feedback_by_priority: Dict[FeedbackPriority, int]
    feedback_by_status: Dict[FeedbackStatus, int]
    validation_impact_count: Dict[str, int]  # Count by validation code
    average_resolution_time: float  # In hours
    critical_issues_count: int
    unresolved_critical_count: int
    
    @property
    def has_critical_issues(self) -> bool:
        """Check if there are unresolved critical issues"""
        return self.unresolved_critical_count > 0
    
    @property
    def validation_coverage(self) -> float:
        """Calculate percentage of validation requirements with feedback"""
        total_validations = 9  # Total number of VALIDATION-* requirements
        return (len(self.validation_impact_count) / total_validations) * 100
