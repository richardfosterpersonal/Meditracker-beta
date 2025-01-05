"""
Audit Service for Medication Tracker
Last Updated: 2024-12-24T23:14:13+01:00

Critical Path: Security.Audit
"""
from typing import Dict, Any, Optional
from datetime import datetime
from prometheus_client import Counter
from app.core.monitoring import monitor, log_error

# Audit Metrics
audit_events = Counter(
    'audit_events_total',
    'Total number of audit events',
    ['event_type', 'status']
)

class AuditService:
    """
    Audit service for tracking security events
    Critical Path: Security.Audit
    """
    
    def __init__(self):
        """Initialize audit service"""
        self._audit_log = []
        
    @monitor(metric=audit_events)
    async def log_event(self, event_type: str, details: Dict[str, Any]) -> None:
        """
        Log audit event with evidence collection
        Critical Path: Security.Evidence
        """
        try:
            event = {
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": event_type,
                "details": details
            }
            self._audit_log.append(event)
            audit_events.labels(event_type=event_type, status="success").inc()
        except Exception as e:
            log_error(e, {"event_type": event_type, "details": details})
            audit_events.labels(event_type=event_type, status="error").inc()
            raise
            
    @monitor(metric=audit_events)
    async def get_events(
        self,
        event_type: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> list[Dict[str, Any]]:
        """
        Get audit events with optional filtering
        Critical Path: Security.Audit
        """
        try:
            filtered_events = self._audit_log
            
            if event_type:
                filtered_events = [
                    event for event in filtered_events
                    if event["event_type"] == event_type
                ]
                
            if start_time:
                filtered_events = [
                    event for event in filtered_events
                    if event["timestamp"] >= start_time
                ]
                
            if end_time:
                filtered_events = [
                    event for event in filtered_events
                    if event["timestamp"] <= end_time
                ]
                
            audit_events.labels(event_type="get_events", status="success").inc()
            return filtered_events
        except Exception as e:
            log_error(e, {
                "event_type": event_type,
                "start_time": start_time,
                "end_time": end_time
            })
            audit_events.labels(event_type="get_events", status="error").inc()
            raise
