from datetime import datetime
from typing import List, Optional
from .entities import BetaUser, BetaUserStatus, BetaFeatureAccess, BetaValidation
from .repositories import BetaUserRepository
from ..core.logging import beta_logger
from ..core.exceptions import ValidationError

class BetaUserService:
    def __init__(self, repository: BetaUserRepository):
        self.repository = repository
        self.logger = beta_logger
    
    async def register_beta_user(self, email: str, name: str) -> BetaUser:
        """Register a new beta user with initial validation requirements"""
        validation = BetaValidation(
            user_id=email,
            completed_validations=[],
            pending_validations=await self.repository.get_active_validations(),
            last_validation_date=datetime.utcnow()
        )
        
        user = BetaUser(
            id=email,
            email=email,
            name=name,
            status=BetaUserStatus.INVITED,
            feature_access=BetaFeatureAccess.CORE,
            created_at=datetime.utcnow(),
            last_active=datetime.utcnow(),
            validation=validation
        )
        
        created_user = await self.repository.create_beta_user(user)
        self.logger.info("beta_user_registered", user_id=email)
        return created_user
    
    async def activate_beta_user(self, user_id: str) -> BetaUser:
        """Activate a beta user after initial setup"""
        user = await self.repository.get_beta_user(user_id)
        if not user:
            raise ValidationError("User not found")
            
        user.status = BetaUserStatus.ACTIVE
        updated_user = await self.repository.update_beta_user(user)
        self.logger.info("beta_user_activated", user_id=user_id)
        return updated_user
    
    async def update_validation_status(self, user_id: str, validation_code: str, completed: bool) -> BetaUser:
        """Update validation status and check compliance"""
        user = await self.repository.update_validation_status(user_id, validation_code, completed)
        
        self.logger.info(
            "beta_validation_updated",
            user_id=user_id,
            validation_code=validation_code,
            completed=completed,
            is_compliant=user.is_compliant()
        )
        
        return user
    
    async def get_validation_summary(self) -> dict:
        """Get summary of validation status across all beta users"""
        metrics = await self.repository.get_validation_metrics()
        non_compliant = await self.repository.get_non_compliant_users()
        
        summary = {
            "total_users": metrics["total_users"],
            "compliant_users": metrics["total_users"] - len(non_compliant),
            "validation_completion": metrics["validation_completion"],
            "non_compliant_count": len(non_compliant)
        }
        
        self.logger.info("beta_validation_summary", **summary)
        return summary
    
    async def record_user_feedback(self, user_id: str, feedback_type: str, content: str) -> None:
        """Record user feedback and update metrics"""
        await self.repository.record_feedback(user_id)
        
        self.logger.info(
            "beta_feedback_received",
            user_id=user_id,
            feedback_type=feedback_type
        )
    
    async def record_user_issue(self, user_id: str, issue_type: str, description: str) -> None:
        """Record user-reported issue and update metrics"""
        await self.repository.record_issue(user_id)
        
        self.logger.error(
            "beta_issue_reported",
            user_id=user_id,
            issue_type=issue_type,
            description=description
        )
    
    async def get_beta_progress_report(self) -> dict:
        """Generate comprehensive beta testing progress report"""
        users = await self.repository.list_beta_users()
        metrics = await self.repository.get_validation_metrics()
        
        report = {
            "total_users": len(users),
            "active_users": len([u for u in users if u.status == BetaUserStatus.ACTIVE]),
            "completed_users": len([u for u in users if u.status == BetaUserStatus.COMPLETED]),
            "total_feedback": sum(u.feedback_count for u in users),
            "total_issues": sum(u.reported_issues for u in users),
            "validation_metrics": metrics,
            "compliance_rate": metrics["compliant_users"] / len(users) if users else 0
        }
        
        self.logger.info("beta_progress_report_generated", **report)
        return report
