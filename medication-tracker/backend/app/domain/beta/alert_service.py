from datetime import datetime
from typing import List, Dict, Optional
from enum import Enum
from .feedback import BetaFeedback, FeedbackType, FeedbackPriority
from ..core.logging import beta_logger

class AlertSeverity(Enum):
    CRITICAL = "critical"  # Immediate action required - affects patient safety
    HIGH = "high"         # Urgent action required - affects core functionality
    MEDIUM = "medium"     # Action required - affects system performance
    LOW = "low"          # Monitoring required - potential future impact

class AlertType(Enum):
    MEDICATION_SAFETY = "medication_safety"   # VALIDATION-MED-* failures
    DATA_SECURITY = "data_security"          # VALIDATION-SEC-* failures
    SYSTEM_RELIABILITY = "system_reliability" # VALIDATION-SYS-* failures

class ValidationAlert:
    def __init__(
        self,
        validation_code: str,
        severity: AlertSeverity,
        alert_type: AlertType,
        description: str,
        affected_components: List[str],
        feedback_id: Optional[str] = None
    ):
        self.validation_code = validation_code
        self.severity = severity
        self.alert_type = alert_type
        self.description = description
        self.affected_components = affected_components
        self.feedback_id = feedback_id
        self.timestamp = datetime.utcnow()
        self.acknowledged = False
        self.resolved = False
        
    @property
    def requires_immediate_action(self) -> bool:
        return (
            self.severity == AlertSeverity.CRITICAL or
            (self.severity == AlertSeverity.HIGH and
             self.alert_type == AlertType.MEDICATION_SAFETY)
        )

class ValidationAlertService:
    def __init__(self):
        self.logger = beta_logger
        # Mapping of validation codes to their critical path components
        self.validation_mapping = {
            "VALIDATION-MED-001": (AlertType.MEDICATION_SAFETY, AlertSeverity.CRITICAL),
            "VALIDATION-MED-002": (AlertType.MEDICATION_SAFETY, AlertSeverity.CRITICAL),
            "VALIDATION-MED-003": (AlertType.MEDICATION_SAFETY, AlertSeverity.HIGH),
            "VALIDATION-SEC-001": (AlertType.DATA_SECURITY, AlertSeverity.CRITICAL),
            "VALIDATION-SEC-002": (AlertType.DATA_SECURITY, AlertSeverity.CRITICAL),
            "VALIDATION-SEC-003": (AlertType.DATA_SECURITY, AlertSeverity.HIGH),
            "VALIDATION-SYS-001": (AlertType.SYSTEM_RELIABILITY, AlertSeverity.HIGH),
            "VALIDATION-SYS-002": (AlertType.SYSTEM_RELIABILITY, AlertSeverity.MEDIUM),
            "VALIDATION-SYS-003": (AlertType.SYSTEM_RELIABILITY, AlertSeverity.HIGH),
        }
    
    def process_feedback_alert(self, feedback: BetaFeedback) -> Optional[ValidationAlert]:
        """Process feedback and generate validation alert if necessary"""
        if not feedback.validation_references:
            return None
            
        # Find the most critical validation reference
        critical_ref = max(
            feedback.validation_references,
            key=lambda r: self.validation_mapping[r.validation_code][1].value
        )
        
        alert_type, severity = self.validation_mapping[critical_ref.validation_code]
        
        # Create alert for critical validation issues
        if severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
            alert = ValidationAlert(
                validation_code=critical_ref.validation_code,
                severity=severity,
                alert_type=alert_type,
                description=f"Validation failure reported: {feedback.title}",
                affected_components=critical_ref.affected_components,
                feedback_id=feedback.id
            )
            
            self._log_alert(alert)
            self._notify_team(alert)
            
            return alert
        
        return None
    
    def process_system_validation_failure(
        self,
        validation_code: str,
        error_message: str,
        affected_components: List[str]
    ) -> ValidationAlert:
        """Process system-detected validation failures"""
        alert_type, severity = self.validation_mapping[validation_code]
        
        alert = ValidationAlert(
            validation_code=validation_code,
            severity=severity,
            alert_type=alert_type,
            description=f"System validation failure: {error_message}",
            affected_components=affected_components
        )
        
        self._log_alert(alert)
        self._notify_team(alert)
        
        return alert
    
    def _log_alert(self, alert: ValidationAlert) -> None:
        """Log validation alert with appropriate severity"""
        log_data = {
            "validation_code": alert.validation_code,
            "severity": alert.severity.value,
            "alert_type": alert.alert_type.value,
            "affected_components": alert.affected_components,
            "feedback_id": alert.feedback_id,
            "requires_immediate_action": alert.requires_immediate_action
        }
        
        if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
            self.logger.error("validation_alert_critical", **log_data)
        else:
            self.logger.warning("validation_alert", **log_data)
    
    def _notify_team(self, alert: ValidationAlert) -> None:
        """Send notifications based on alert severity and type"""
        if alert.requires_immediate_action:
            self.logger.error(
                "immediate_action_required",
                validation_code=alert.validation_code,
                alert_type=alert.alert_type.value,
                description=alert.description
            )
            # In a real implementation, this would:
            # 1. Send immediate notifications (email, SMS, etc.)
            # 2. Create incident tickets
            # 3. Trigger emergency response procedures if necessary
