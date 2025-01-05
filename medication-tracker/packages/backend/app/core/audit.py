from datetime import datetime
from typing import Any, Dict, Optional
import json
import logging
from enum import Enum
from pydantic import BaseModel

class AuditEventType(str, Enum):
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    PASSWORD_CHANGE = "password_change"
    DATA_ACCESS = "data_access"
    DATA_MODIFY = "data_modify"
    PHI_ACCESS = "phi_access"
    PHI_MODIFY = "phi_modify"
    SECURITY_EVENT = "security_event"
    SYSTEM_EVENT = "system_event"

class AuditEvent(BaseModel):
    """Model for audit events"""
    timestamp: datetime
    event_type: AuditEventType
    user_id: Optional[str]
    action: str
    resource: str
    status: str
    details: Dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        
        # Add file handler for audit logs
        handler = logging.FileHandler("audit.log")
        handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        )
        self.logger.addHandler(handler)

    def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str],
        action: str,
        resource: str,
        status: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log an audit event"""
        event = AuditEvent(
            timestamp=datetime.now(),
            event_type=event_type,
            user_id=user_id,
            action=action,
            resource=resource,
            status=status,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Log the event
        self.logger.info(event.json())

    def log_phi_access(
        self,
        user_id: str,
        resource: str,
        action: str,
        status: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Specifically log PHI access events"""
        self.log_event(
            event_type=AuditEventType.PHI_ACCESS,
            user_id=user_id,
            action=action,
            resource=resource,
            status=status,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )

    def log_security_event(
        self,
        action: str,
        status: str,
        details: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log security-related events"""
        self.log_event(
            event_type=AuditEventType.SECURITY_EVENT,
            user_id=user_id,
            action=action,
            resource="security",
            status=status,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )

    def log_data_modification(
        self,
        user_id: str,
        resource: str,
        action: str,
        status: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log data modification events"""
        self.log_event(
            event_type=AuditEventType.DATA_MODIFY,
            user_id=user_id,
            action=action,
            resource=resource,
            status=status,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )

# Global instance
audit_logger = AuditLogger()
