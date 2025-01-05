"""
Alert Handler Module
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:33:52+01:00
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional
import logging
import json

from app.core.validation_types import ValidationResult
from app.services.metrics_service import MetricsService
from app.services.notification_service import NotificationService
from app.core.evidence_collector import EvidenceCollector

class AlertSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AlertCategory(Enum):
    SECURITY = "security"
    PERFORMANCE = "performance"
    AVAILABILITY = "availability"
    COMPLIANCE = "compliance"
    VALIDATION = "validation"

class AlertHandler:
    def __init__(
        self,
        metrics_service: MetricsService,
        notification_service: NotificationService,
        evidence_collector: EvidenceCollector
    ):
        self.metrics_service = metrics_service
        self.notification_service = notification_service
        self.evidence_collector = evidence_collector
        self.logger = logging.getLogger(__name__)

    async def handle_alert(
        self,
        alert_id: str,
        severity: AlertSeverity,
        category: AlertCategory,
        message: str,
        context: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Handle an alert with validation and evidence collection
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Validate alert data
        validation_result = await self._validate_alert(
            alert_id, severity, category, message, context
        )
        if not validation_result.is_valid:
            return validation_result

        # Collect evidence
        evidence["alert"] = {
            "id": alert_id,
            "severity": severity.value,
            "category": category.value,
            "message": message,
            "context": context,
            "timestamp": timestamp
        }
        
        await self.evidence_collector.collect_evidence(
            evidence_type="alert",
            evidence_data=evidence["alert"]
        )

        # Track metrics
        await self.metrics_service.track_alert(
            alert_id=alert_id,
            severity=severity.value,
            category=category.value,
            timestamp=timestamp
        )

        # Send notifications based on severity and category
        notification_channels = self._get_notification_channels(severity, category)
        await self.notification_service.send_notifications(
            channels=notification_channels,
            message=message,
            context=context
        )

        # Log alert
        self._log_alert(severity, category, message, context)

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )

    async def _validate_alert(
        self,
        alert_id: str,
        severity: AlertSeverity,
        category: AlertCategory,
        message: str,
        context: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate alert data against requirements
        """
        if not alert_id:
            return ValidationResult(
                is_valid=False,
                error="Alert ID is required",
                timestamp=datetime.utcnow().isoformat()
            )

        if not message:
            return ValidationResult(
                is_valid=False,
                error="Alert message is required",
                timestamp=datetime.utcnow().isoformat()
            )

        if not isinstance(context, dict):
            return ValidationResult(
                is_valid=False,
                error="Context must be a dictionary",
                timestamp=datetime.utcnow().isoformat()
            )

        return ValidationResult(
            is_valid=True,
            timestamp=datetime.utcnow().isoformat()
        )

    def _get_notification_channels(
        self,
        severity: AlertSeverity,
        category: AlertCategory
    ) -> List[str]:
        """
        Get notification channels based on severity and category
        """
        channels = []

        # Critical alerts go to all relevant channels
        if severity == AlertSeverity.CRITICAL:
            channels.extend(["ops", "security", "management"])

        # Add category-specific channels
        if category == AlertCategory.SECURITY:
            channels.extend(["security", "compliance"])
        elif category == AlertCategory.COMPLIANCE:
            channels.extend(["compliance", "legal"])
        elif category == AlertCategory.VALIDATION:
            channels.extend(["validation", "quality"])
        elif category == AlertCategory.PERFORMANCE:
            channels.append("ops")
        elif category == AlertCategory.AVAILABILITY:
            channels.extend(["ops", "support"])

        return list(set(channels))  # Remove duplicates

    def _log_alert(
        self,
        severity: AlertSeverity,
        category: AlertCategory,
        message: str,
        context: Dict[str, Any]
    ) -> None:
        """
        Log alert with appropriate level and format
        """
        log_data = {
            "severity": severity.value,
            "category": category.value,
            "message": message,
            "context": context,
            "timestamp": datetime.utcnow().isoformat()
        }

        if severity == AlertSeverity.CRITICAL:
            self.logger.critical(json.dumps(log_data))
        elif severity == AlertSeverity.HIGH:
            self.logger.error(json.dumps(log_data))
        elif severity == AlertSeverity.MEDIUM:
            self.logger.warning(json.dumps(log_data))
        else:
            self.logger.info(json.dumps(log_data))
