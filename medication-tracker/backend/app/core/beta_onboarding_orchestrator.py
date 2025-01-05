"""
Beta Onboarding Orchestrator
Manages the complete beta user onboarding lifecycle
Last Updated: 2025-01-01T19:08:53+01:00
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import json
import logging
from enum import Enum
from pathlib import Path

from .beta_settings import BetaSettings
from .validation_metrics import ValidationMetrics, MetricType, ValidationLevel, ValidationStatus
from .beta_requirements_validator import BetaRequirementsValidator
from ..domain.beta.entities import BetaUser
from ..domain.beta.repositories import BetaUserRepository
from ..infrastructure.notification.notification_handler import NotificationHandler, NotificationType, NotificationPriority
from ..services.beta_onboarding_service import BetaOnboardingService

class OnboardingPhase(Enum):
    """Beta onboarding phases"""
    REGISTRATION = "registration"
    DOCUMENTATION = "documentation"
    TRAINING = "training"
    INITIAL_ACCESS = "initial_access"
    MONITORING = "monitoring"
    FEEDBACK = "feedback"
    GRADUATION = "graduation"

class OnboardingStatus(Enum):
    """Onboarding status states"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    GRADUATED = "graduated"

class BetaOnboardingOrchestrator:
    """Orchestrates the beta user onboarding process"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.metrics = ValidationMetrics()
        self.validator = BetaRequirementsValidator()
        self.onboarding = BetaOnboardingService()
        self.notifications = NotificationHandler()
        self.logger = logging.getLogger(__name__)
        
    async def start_onboarding(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start the onboarding process for a new beta user
        
        Args:
            user_data: User registration data
            
        Returns:
            Onboarding status and next steps
        """
        try:
            # Initialize onboarding metrics
            start_time = datetime.utcnow()
            
            # Create beta user profile
            beta_user = await self.onboarding.start_onboarding(user_data)
            
            # Send welcome notification
            await self.notifications.send_notification(
                user_id=beta_user.id,
                message="Welcome to the Beta Program! Let's get started with your onboarding.",
                notification_type=NotificationType.INFO,
                priority=NotificationPriority.HIGH,
                metadata={
                    "phase": OnboardingPhase.REGISTRATION.value,
                    "status": OnboardingStatus.IN_PROGRESS.value
                }
            )
            
            # Schedule initial documentation delivery
            await self._schedule_documentation(beta_user)
            
            # Record metrics
            await self._record_onboarding_metrics(
                beta_user.id,
                OnboardingPhase.REGISTRATION,
                start_time
            )
            
            return {
                "user_id": beta_user.id,
                "status": OnboardingStatus.IN_PROGRESS.value,
                "current_phase": OnboardingPhase.REGISTRATION.value,
                "next_steps": await self._get_next_steps(beta_user),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to start onboarding: {str(e)}")
            raise
            
    async def track_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Track user's onboarding progress
        
        Args:
            user_id: Beta user ID
            
        Returns:
            Current onboarding status and progress
        """
        try:
            # Get current progress
            progress = await self.onboarding.track_progress(user_id)
            
            # Calculate completion percentage
            completion = await self._calculate_completion(user_id)
            
            # Get phase-specific metrics
            metrics = await self._get_phase_metrics(user_id)
            
            return {
                "user_id": user_id,
                "status": progress["status"],
                "current_phase": progress["current_phase"],
                "completion_percentage": completion,
                "metrics": metrics,
                "next_steps": progress["next_steps"],
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to track progress: {str(e)}")
            raise
            
    async def complete_phase(
        self,
        user_id: str,
        phase: OnboardingPhase,
        evidence: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Complete an onboarding phase
        
        Args:
            user_id: Beta user ID
            phase: Completed phase
            evidence: Optional completion evidence
            
        Returns:
            Updated status and next phase
        """
        try:
            # Validate phase completion
            await self._validate_phase_completion(user_id, phase, evidence)
            
            # Update user progress
            if phase == OnboardingPhase.TRAINING:
                await self.onboarding.complete_training(user_id, phase.value)
            
            # Check for graduation eligibility
            if phase == OnboardingPhase.FEEDBACK:
                await self._check_graduation(user_id)
            
            # Get next phase
            next_phase = await self._determine_next_phase(user_id, phase)
            
            # Notify user
            await self._send_phase_completion_notification(user_id, phase, next_phase)
            
            return {
                "user_id": user_id,
                "completed_phase": phase.value,
                "next_phase": next_phase.value if next_phase else None,
                "status": OnboardingStatus.COMPLETED.value if next_phase is None else OnboardingStatus.IN_PROGRESS.value,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to complete phase: {str(e)}")
            raise
            
    async def collect_feedback(
        self,
        user_id: str,
        feedback_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Collect and process user feedback
        
        Args:
            user_id: Beta user ID
            feedback_data: User feedback
            
        Returns:
            Feedback processing results
        """
        try:
            # Process feedback
            result = await self.onboarding.collect_feedback(user_id, feedback_data)
            
            # Check graduation eligibility
            if result.get("feedback_count", 0) >= self.settings.MIN_FEEDBACK_FOR_GRADUATION:
                await self._check_graduation(user_id)
            
            return {
                "user_id": user_id,
                "feedback_id": result["feedback_id"],
                "status": "processed",
                "graduation_eligible": result.get("graduation_eligible", False),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect feedback: {str(e)}")
            raise
            
    async def _validate_phase_completion(
        self,
        user_id: str,
        phase: OnboardingPhase,
        evidence: Optional[Dict]
    ) -> None:
        """Validate phase completion requirements"""
        try:
            if phase == OnboardingPhase.TRAINING:
                await self.validator.validate_core_functionality(evidence or {})
            elif phase == OnboardingPhase.INITIAL_ACCESS:
                await self.validator.validate_user_experience(evidence or {})
            elif phase == OnboardingPhase.MONITORING:
                await self.validator.validate_stability(evidence or {})
                
        except Exception as e:
            raise ValueError(f"Phase completion validation failed: {str(e)}")
            
    async def _determine_next_phase(
        self,
        user_id: str,
        current_phase: OnboardingPhase
    ) -> Optional[OnboardingPhase]:
        """Determine next onboarding phase"""
        phase_order = [
            OnboardingPhase.REGISTRATION,
            OnboardingPhase.DOCUMENTATION,
            OnboardingPhase.TRAINING,
            OnboardingPhase.INITIAL_ACCESS,
            OnboardingPhase.MONITORING,
            OnboardingPhase.FEEDBACK,
            OnboardingPhase.GRADUATION
        ]
        
        try:
            current_index = phase_order.index(current_phase)
            if current_index < len(phase_order) - 1:
                return phase_order[current_index + 1]
            return None
            
        except ValueError:
            raise ValueError(f"Invalid phase: {current_phase}")
            
    async def _send_phase_completion_notification(
        self,
        user_id: str,
        completed_phase: OnboardingPhase,
        next_phase: Optional[OnboardingPhase]
    ) -> None:
        """Send phase completion notification"""
        try:
            if next_phase:
                message = (
                    f"Congratulations! You've completed the {completed_phase.value} phase. "
                    f"Next up: {next_phase.value}"
                )
            else:
                message = (
                    f"Congratulations! You've completed the {completed_phase.value} phase. "
                    "You're now ready to graduate from the beta program!"
                )
                
            await self.notifications.send_notification(
                user_id=user_id,
                message=message,
                notification_type=NotificationType.INFO,
                priority=NotificationPriority.HIGH,
                metadata={
                    "completed_phase": completed_phase.value,
                    "next_phase": next_phase.value if next_phase else None
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send completion notification: {str(e)}")
            
    async def _check_graduation(self, user_id: str) -> None:
        """Check if user is eligible for graduation"""
        try:
            eligible = await self.onboarding.check_graduation_eligibility(user_id)
            
            if eligible:
                await self.notifications.send_notification(
                    user_id=user_id,
                    message=(
                        "Congratulations! You're eligible to graduate from the beta program. "
                        "We'll be in touch with next steps."
                    ),
                    notification_type=NotificationType.INFO,
                    priority=NotificationPriority.HIGH,
                    metadata={"status": OnboardingStatus.GRADUATED.value}
                )
                
        except Exception as e:
            self.logger.error(f"Failed to check graduation eligibility: {str(e)}")
            
    async def _calculate_completion(self, user_id: str) -> float:
        """Calculate overall onboarding completion percentage"""
        try:
            progress = await self.onboarding.track_progress(user_id)
            completed_phases = len([
                p for p in progress["phases"]
                if p["status"] == OnboardingStatus.COMPLETED.value
            ])
            return (completed_phases / len(OnboardingPhase)) * 100
            
        except Exception:
            return 0.0
            
    async def _get_phase_metrics(self, user_id: str) -> Dict[str, Any]:
        """Get phase-specific metrics"""
        try:
            metrics = await self.metrics.get_metrics("onboarding")
            return {
                m.type.value: m.value
                for m in metrics
                if m.details.get("user_id") == user_id
            }
            
        except Exception:
            return {}
            
    async def _record_onboarding_metrics(
        self,
        user_id: str,
        phase: OnboardingPhase,
        start_time: datetime
    ) -> None:
        """Record onboarding metrics"""
        try:
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            await self.metrics.record_metric(
                "onboarding",
                MetricType.VALIDATION_TIME,
                duration,
                ValidationLevel.INFO,
                ValidationStatus.PASSED,
                {
                    "user_id": user_id,
                    "phase": phase.value,
                    "start_time": start_time.isoformat()
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to record onboarding metrics: {str(e)}")
            
    async def _get_next_steps(self, beta_user: BetaUser) -> List[Dict[str, str]]:
        """Get next steps for user"""
        try:
            current_phase = await self._determine_current_phase(beta_user)
            
            if current_phase == OnboardingPhase.REGISTRATION:
                return [
                    {
                        "step": "Review Documentation",
                        "description": "Review the beta testing documentation and guidelines"
                    },
                    {
                        "step": "Complete Training",
                        "description": "Complete the required training modules"
                    }
                ]
            elif current_phase == OnboardingPhase.DOCUMENTATION:
                return [
                    {
                        "step": "Training Modules",
                        "description": "Start your training modules"
                    }
                ]
            elif current_phase == OnboardingPhase.TRAINING:
                return [
                    {
                        "step": "Initial Access",
                        "description": "Begin using the basic features"
                    }
                ]
            elif current_phase == OnboardingPhase.INITIAL_ACCESS:
                return [
                    {
                        "step": "Provide Feedback",
                        "description": "Share your experience and suggestions"
                    }
                ]
            else:
                return []
                
        except Exception:
            return []
            
    async def _determine_current_phase(self, beta_user: BetaUser) -> OnboardingPhase:
        """Determine user's current phase"""
        try:
            progress = await self.onboarding.track_progress(beta_user.id)
            return OnboardingPhase(progress["current_phase"])
        except Exception:
            return OnboardingPhase.REGISTRATION

# Global instance
beta_onboarding = BetaOnboardingOrchestrator()
