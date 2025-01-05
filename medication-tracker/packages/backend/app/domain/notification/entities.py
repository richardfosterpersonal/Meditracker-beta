from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from app.domain.shared.base_entity import BaseEntity

@dataclass
class NotificationType:
    MEDICATION_DUE = "medication_due"
    MEDICATION_MISSED = "medication_missed"
    MEDICATION_TAKEN = "medication_taken"
    REFILL_NEEDED = "refill_needed"
    COMPLIANCE_ALERT = "compliance_alert"
    CARER_ASSIGNMENT = "carer_assignment"
    EMERGENCY_ALERT = "emergency_alert"

@dataclass
class NotificationTemplate:
    type: str = field(default="info")
    title: str = field(default="")
    message: str = field(default="")
    urgency: str = "normal"  # normal, urgent, emergency
    action_required: bool = False
    action_type: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None

@dataclass
class Notification(BaseEntity):
    user_id: int = field(default=0)
    type: str = field(default="info")
    title: str = field(default="")
    message: str = field(default="")
    data: Dict[str, Any] = field(default_factory=dict)
    read: bool = False
    sent: bool = False
    error: Optional[str] = None
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    urgency: str = "normal"
    action_required: bool = False
    action_type: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None
    carer_id: Optional[int] = None

    def mark_as_read(self):
        self.read = True
        self.read_at = datetime.utcnow()
        self.update_timestamp()

    def mark_as_sent(self):
        self.sent = True
        self.sent_at = datetime.utcnow()
        self.update_timestamp()

    def record_error(self, error: str):
        self.error = error
        self.update_timestamp()

@dataclass
class NotificationSchedule(BaseEntity):
    user_id: int = field(default=0)
    notification_type: str = field(default="reminder")
    scheduled_time: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)
    processed: bool = False
    processed_at: Optional[datetime] = None
    recurring: bool = False
    recurrence_pattern: Optional[str] = None
    next_schedule: Optional[datetime] = None
    carer_id: Optional[int] = None

    def mark_as_processed(self):
        self.processed = True
        self.processed_at = datetime.utcnow()
        if self.recurring and self.recurrence_pattern:
            # Logic to calculate next schedule based on recurrence pattern
            pass
        self.update_timestamp()
