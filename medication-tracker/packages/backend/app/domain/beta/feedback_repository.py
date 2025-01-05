from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime
from .feedback import BetaFeedback, FeedbackType, FeedbackPriority, FeedbackStatus, FeedbackMetrics

class BetaFeedbackRepository(ABC):
    """Repository interface for managing beta feedback"""
    
    @abstractmethod
    async def create_feedback(self, feedback: BetaFeedback) -> BetaFeedback:
        """Create new feedback entry"""
        pass
    
    @abstractmethod
    async def get_feedback(self, feedback_id: str) -> Optional[BetaFeedback]:
        """Retrieve specific feedback by ID"""
        pass
    
    @abstractmethod
    async def update_feedback(self, feedback: BetaFeedback) -> BetaFeedback:
        """Update existing feedback"""
        pass
    
    @abstractmethod
    async def list_feedback(
        self,
        user_id: Optional[str] = None,
        feedback_type: Optional[FeedbackType] = None,
        status: Optional[FeedbackStatus] = None,
        priority: Optional[FeedbackPriority] = None,
        validation_code: Optional[str] = None
    ) -> List[BetaFeedback]:
        """List feedback with optional filters"""
        pass
    
    @abstractmethod
    async def get_critical_feedback(self) -> List[BetaFeedback]:
        """Get all critical feedback that requires immediate attention"""
        pass
    
    @abstractmethod
    async def get_validation_feedback(self, validation_code: str) -> List[BetaFeedback]:
        """Get all feedback related to a specific validation requirement"""
        pass
    
    @abstractmethod
    async def get_feedback_metrics(self, start_date: Optional[datetime] = None) -> FeedbackMetrics:
        """Get aggregated feedback metrics"""
        pass
    
    @abstractmethod
    async def get_validation_impact_summary(self) -> Dict[str, Dict[str, int]]:
        """Get summary of feedback impact on validation requirements"""
        pass
    
    @abstractmethod
    async def add_feedback_resolution(
        self,
        feedback_id: str,
        resolution: str,
        status: FeedbackStatus
    ) -> BetaFeedback:
        """Add resolution to feedback"""
        pass
    
    @abstractmethod
    async def get_unresolved_validation_issues(self) -> List[BetaFeedback]:
        """Get all unresolved feedback affecting validation requirements"""
        pass
    
    @abstractmethod
    async def get_feedback_trends(
        self,
        days: int = 30
    ) -> Dict[str, List[Dict[str, any]]]:
        """Get feedback trends over time"""
        pass
