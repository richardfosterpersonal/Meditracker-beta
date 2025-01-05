"""
Comprehensive Audit System
Last Updated: 2024-12-25T12:15:35+01:00
Permission: CORE
Reference: MASTER_CRITICAL_PATH.md
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from enum import Enum
from dataclasses import dataclass
import json

class AuditLevel(Enum):
    """Audit Event Classification"""
    CRITICAL = "critical"  # Security-critical events
    IMPORTANT = "important"  # Significant system events
    ROUTINE = "routine"  # Regular operations

@dataclass
class AuditEvent:
    """Audit Event Record"""
    event_id: str
    timestamp: datetime
    level: AuditLevel
    component: str
    action: str
    user_id: str
    details: Dict
    validation_status: bool

class AuditSystem:
    """Comprehensive Audit System"""
    
    def __init__(self):
        self.logger = self._setup_logger()
        self.events: List[AuditEvent] = []
    
    def _setup_logger(self) -> logging.Logger:
        """Setup secure audit logging"""
        logger = logging.getLogger('audit_system')
        logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - '
            '%(message)s - Reference: MASTER_CRITICAL_PATH.md'
        )
        
        handler = logging.FileHandler('logs/audit_system.log')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    def log_event(self,
                 level: AuditLevel,
                 component: str,
                 action: str,
                 user_id: str,
                 details: Dict) -> str:
        """Log an audit event"""
        try:
            event = AuditEvent(
                event_id=f"EVENT_{datetime.now().timestamp()}",
                timestamp=datetime.now(),
                level=level,
                component=component,
                action=action,
                user_id=user_id,
                details=details,
                validation_status=True
            )
            
            self.events.append(event)
            
            # Log to secure audit log
            self.logger.info(
                f"Audit event - Level: {level.value}, "
                f"Component: {component}, Action: {action}, "
                f"User: {user_id}"
            )
            
            # Write to secure audit file
            self._write_event(event)
            
            return event.event_id
            
        except Exception as e:
            self.logger.error(
                f"Audit logging error - Component: {component}, "
                f"Error: {str(e)}"
            )
            return ""
    
    def _write_event(self, event: AuditEvent) -> None:
        """Write event to secure audit file"""
        try:
            with open('logs/secure_audit.log', 'a') as f:
                event_dict = {
                    'event_id': event.event_id,
                    'timestamp': event.timestamp.isoformat(),
                    'level': event.level.value,
                    'component': event.component,
                    'action': event.action,
                    'user_id': event.user_id,
                    'details': event.details,
                    'validation_status': event.validation_status
                }
                f.write(json.dumps(event_dict) + '\n')
                
        except Exception as e:
            self.logger.error(f"Audit write error: {str(e)}")
    
    def query_events(self,
                    level: Optional[AuditLevel] = None,
                    component: Optional[str] = None,
                    start_time: Optional[datetime] = None,
                    end_time: Optional[datetime] = None) -> List[AuditEvent]:
        """Query audit events with filters"""
        if not start_time:
            start_time = datetime.min
        if not end_time:
            end_time = datetime.max
            
        filtered_events = self.events
        
        if level:
            filtered_events = [
                e for e in filtered_events
                if e.level == level
            ]
            
        if component:
            filtered_events = [
                e for e in filtered_events
                if e.component == component
            ]
            
        return [
            e for e in filtered_events
            if start_time <= e.timestamp <= end_time
        ]
    
    def validate_audit_chain(self) -> bool:
        """Validate audit event chain integrity"""
        try:
            previous_event = None
            
            for event in self.events:
                if not event.validation_status:
                    return False
                    
                if previous_event and \
                   event.timestamp < previous_event.timestamp:
                    return False
                    
                previous_event = event
                
            return True
            
        except Exception as e:
            self.logger.error(f"Audit chain validation error: {str(e)}")
            return False
