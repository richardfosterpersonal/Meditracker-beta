from datetime import datetime
from typing import List, Optional, Dict
from uuid import uuid4
from .feedback import (
    BetaFeedback,
    FeedbackType,
    FeedbackPriority,
    FeedbackStatus,
    ValidationReference,
    FeedbackMetrics
)
from .feedback_repository import BetaFeedbackRepository
from .services import BetaUserService
from ..core.logging import beta_logger
from ..core.exceptions import ValidationError

class BetaFeedbackService:
    def __init__(
        self,
        feedback_repository: BetaFeedbackRepository,
        beta_user_service: BetaUserService
    ):
        self.repository = feedback_repository
        self.beta_user_service = beta_user_service
        self.logger = beta_logger
    
    async def submit_feedback(
        self,
        user_id: str,
        feedback_type: FeedbackType,
        title: str,
        description: str,
        affected_features: List[str],
        validation_references: List[Dict[str, str]],
        priority: Optional[FeedbackPriority] = None,
        metrics: Optional[Dict[str, float]] = None,
        screenshots: Optional[List[str]] = None,
        system_info: Optional[Dict[str, str]] = None
    ) -> BetaFeedback:
        """Submit new feedback with validation tracking"""
        
        # Convert validation references
        val_refs = [
            ValidationReference(
                validation_code=ref["code"],
                impact_level=ref.get("impact_level", "medium"),
                description=ref.get("description", ""),
                affected_components=ref.get("components", [])
            )
            for ref in validation_references
        ]
        
        # Determine priority if not provided
        if priority is None:
            priority = self._calculate_priority(feedback_type, val_refs)
        
        feedback = BetaFeedback(
            id=str(uuid4()),
            user_id=user_id,
            type=feedback_type,
            priority=priority,
            status=FeedbackStatus.NEW,
            title=title,
            description=description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            validation_references=val_refs,
            affected_features=affected_features,
            metrics=metrics or {},
            screenshots=screenshots or [],
            system_info=system_info or {}
        )
        
        # Save feedback
        created_feedback = await self.repository.create_feedback(feedback)
        
        # Update beta user metrics
        await self.beta_user_service.record_user_feedback(
            user_id,
            feedback_type.value,
            title
        )
        
        # Log feedback submission
        self.logger.info(
            "beta_feedback_submitted",
            feedback_id=created_feedback.id,
            user_id=user_id,
            type=feedback_type.value,
            priority=priority.value,
            validation_codes=[ref.validation_code for ref in val_refs]
        )
        
        # Handle critical feedback
        if created_feedback.requires_immediate_attention():
            await self._handle_critical_feedback(created_feedback)
        
        return created_feedback
    
    def _calculate_priority(
        self,
        feedback_type: FeedbackType,
        validation_refs: List[ValidationReference]
    ) -> FeedbackPriority:
        """Calculate feedback priority based on type and validation impact"""
        if feedback_type in {FeedbackType.SECURITY, FeedbackType.VALIDATION}:
            return FeedbackPriority.CRITICAL
            
        if any(ref.impact_level == "high" for ref in validation_refs):
            return FeedbackPriority.HIGH
            
        if feedback_type == FeedbackType.BUG:
            return FeedbackPriority.MEDIUM
            
        return FeedbackPriority.LOW
    
    async def _handle_critical_feedback(self, feedback: BetaFeedback) -> None:
        """Handle critical feedback that requires immediate attention"""
        # Log critical issue
        self.logger.error(
            "critical_beta_feedback",
            feedback_id=feedback.id,
            user_id=feedback.user_id,
            validation_codes=feedback.get_affected_validations()
        )
        
        # Update status
        feedback.status = FeedbackStatus.UNDER_REVIEW
        await self.repository.update_feedback(feedback)
    
    async def get_validation_impact_report(self) -> Dict[str, any]:
        """Generate report of feedback impact on validation requirements"""
        metrics = await self.repository.get_feedback_metrics()
        impact_summary = await self.repository.get_validation_impact_summary()
        unresolved = await self.repository.get_unresolved_validation_issues()
        
        report = {
            "total_validation_feedback": len([
                f for f in metrics.feedback_by_type.items()
                if f[0] == FeedbackType.VALIDATION
            ]),
            "validation_coverage": metrics.validation_coverage,
            "impact_by_requirement": impact_summary,
            "unresolved_validation_issues": len(unresolved),
            "critical_validation_issues": metrics.unresolved_critical_count
        }
        
        self.logger.info("validation_impact_report_generated", **report)
        return report
    
    async def get_feedback_dashboard_data(self) -> Dict[str, any]:
        """Get aggregated data for feedback dashboard"""
        metrics = await self.repository.get_feedback_metrics()
        trends = await self.repository.get_feedback_trends()
        
        dashboard_data = {
            "metrics": {
                "total_feedback": metrics.total_feedback,
                "by_type": metrics.feedback_by_type,
                "by_priority": metrics.feedback_by_priority,
                "by_status": metrics.feedback_by_status,
                "validation_impact": metrics.validation_impact_count
            },
            "trends": trends,
            "critical_issues": {
                "total": metrics.critical_issues_count,
                "unresolved": metrics.unresolved_critical_count
            },
            "validation_metrics": {
                "coverage": metrics.validation_coverage,
                "average_resolution_time": metrics.average_resolution_time
            }
        }
        
        return dashboard_data
