"""
Audit Logger Module
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:33:52+01:00
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
import json
import logging
import os
from pathlib import Path

from app.core.validation_types import ValidationResult
from app.services.metrics_service import MetricsService
from app.core.evidence_collector import EvidenceCollector

class AuditEventType(Enum):
    USER_ACCESS = "user_access"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    SECURITY_EVENT = "security_event"
    VALIDATION_EVENT = "validation_event"
    COMPLIANCE_CHECK = "compliance_check"
    CRITICAL_PATH = "critical_path"

class AuditLogger:
    def __init__(
        self,
        metrics_service: MetricsService,
        evidence_collector: EvidenceCollector,
        log_dir: str = "/logs/audit"
    ):
        self.metrics_service = metrics_service
        self.evidence_collector = evidence_collector
        self.log_dir = Path(log_dir)
        self.logger = logging.getLogger(__name__)
        
        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure audit logger
        self._configure_logger()

    def _configure_logger(self) -> None:
        """
        Configure audit logger with HIPAA-compliant settings
        """
        audit_handler = logging.FileHandler(
            self.log_dir / "audit.log",
            encoding="utf-8"
        )
        audit_handler.setFormatter(
            logging.Formatter(
                '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
                '"event": %(message)s}'
            )
        )
        self.logger.addHandler(audit_handler)
        self.logger.setLevel(logging.INFO)

    async def log_event(
        self,
        event_type: AuditEventType,
        user_id: str,
        resource_id: str,
        action: str,
        details: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Log an audit event with validation and evidence collection
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Validate event data
        validation_result = await self._validate_event(
            event_type, user_id, resource_id, action, details
        )
        if not validation_result.is_valid:
            return validation_result

        # Build event data
        event_data = {
            "event_type": event_type.value,
            "user_id": user_id,
            "resource_id": resource_id,
            "action": action,
            "details": details,
            "timestamp": timestamp
        }

        # Collect evidence
        evidence["audit"] = event_data
        await self.evidence_collector.collect_evidence(
            evidence_type="audit",
            evidence_data=event_data
        )

        # Track metrics
        await self.metrics_service.track_audit_event(
            event_type=event_type.value,
            user_id=user_id,
            resource_id=resource_id,
            action=action,
            timestamp=timestamp
        )

        # Log the event
        self._log_event(event_data)

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )

    async def _validate_event(
        self,
        event_type: AuditEventType,
        user_id: str,
        resource_id: str,
        action: str,
        details: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate audit event data against requirements
        """
        if not user_id:
            return ValidationResult(
                is_valid=False,
                error="User ID is required",
                timestamp=datetime.utcnow().isoformat()
            )

        if not resource_id:
            return ValidationResult(
                is_valid=False,
                error="Resource ID is required",
                timestamp=datetime.utcnow().isoformat()
            )

        if not action:
            return ValidationResult(
                is_valid=False,
                error="Action is required",
                timestamp=datetime.utcnow().isoformat()
            )

        if not isinstance(details, dict):
            return ValidationResult(
                is_valid=False,
                error="Details must be a dictionary",
                timestamp=datetime.utcnow().isoformat()
            )

        return ValidationResult(
            is_valid=True,
            timestamp=datetime.utcnow().isoformat()
        )

    def _log_event(self, event_data: Dict[str, Any]) -> None:
        """
        Log the audit event in HIPAA-compliant format
        """
        # Ensure sensitive data is masked
        sanitized_data = self._sanitize_sensitive_data(event_data)
        
        # Log with appropriate level based on event type
        if event_data["event_type"] in [
            AuditEventType.SECURITY_EVENT.value,
            AuditEventType.CRITICAL_PATH.value
        ]:
            self.logger.warning(json.dumps(sanitized_data))
        else:
            self.logger.info(json.dumps(sanitized_data))

    def _sanitize_sensitive_data(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sanitize sensitive data before logging
        """
        sanitized = event_data.copy()
        
        # Mask sensitive fields in details
        if "details" in sanitized:
            details = sanitized["details"]
            if "password" in details:
                details["password"] = "********"
            if "ssn" in details:
                details["ssn"] = "***-**-****"
            if "dob" in details:
                details["dob"] = "****-**-**"

        return sanitized

    async def get_audit_trail(
        self,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> ValidationResult:
        """
        Retrieve audit trail with filters
        """
        timestamp = datetime.utcnow().isoformat()
        audit_trail = []

        try:
            with open(self.log_dir / "audit.log", "r") as f:
                for line in f:
                    event = json.loads(line)
                    
                    # Apply filters
                    if user_id and event.get("user_id") != user_id:
                        continue
                    if resource_id and event.get("resource_id") != resource_id:
                        continue
                    if event_type and event.get("event_type") != event_type.value:
                        continue
                    if start_time and event.get("timestamp") < start_time:
                        continue
                    if end_time and event.get("timestamp") > end_time:
                        continue
                    
                    audit_trail.append(event)

        except Exception as e:
            return ValidationResult(
                is_valid=False,
                error=f"Failed to retrieve audit trail: {str(e)}",
                timestamp=timestamp
            )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            data=audit_trail
        )
