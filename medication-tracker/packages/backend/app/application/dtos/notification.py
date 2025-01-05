from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from .base import BaseDTO, BaseResponseDTO

@dataclass
class NotificationPreferencesDTO:
    email_enabled: bool = False
    push_enabled: bool = False
    reminder_time: str = "09:00"
    timezone: str = "UTC"
    advance_notice: int = 30  # minutes

@dataclass
class CreateNotificationDTO:
    user_id: int = field(default=0)
    type: str = field(default="info")
    title: str = field(default="")
    message: str = field(default="")
    data: Dict[str, Any] = field(default_factory=dict)
    urgency: str = "normal"
    action_required: bool = False
    action_type: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None
    carer_id: Optional[int] = None
    template_id: Optional[str] = None
    schedule_time: Optional[datetime] = None
    channels: List[str] = field(default_factory=lambda: ["email", "push"])
    retry_count: int = 0
    max_retries: int = 3
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class NotificationResponseDTO(BaseResponseDTO):
    id: int = field(default=0)
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
    status: str = field(default="")
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    retry_count: int = 0
    schedule_time: Optional[datetime] = None
    sent_via: List[str] = field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class CreateScheduleDTO:
    user_id: int = field(default=0)
    notification_type: str = field(default="reminder")
    scheduled_time: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)
    recurring: bool = False
    recurrence_pattern: Optional[str] = None
    carer_id: Optional[int] = None

@dataclass
class ScheduleResponseDTO(BaseResponseDTO):
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

@dataclass
class UpdatePreferencesDTO:
    user_id: int = field(default=0)
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: str = "UTC"
    urgency_override: bool = True
    channels: Dict[str, bool] = field(
        default_factory=lambda: {
            "medication_reminder": True,
            "refill_reminder": True,
            "interaction_alert": True,
            "compliance_report": True
        }
    )

@dataclass
class NotificationSummaryDTO:
    unread_count: int = field(default=0)
    urgent_count: int = field(default=0)
    action_required_count: int = field(default=0)
    latest_notifications: List[NotificationResponseDTO] = field(default_factory=list)

@dataclass
class NotificationChannelDTO:
    channel_type: str = field(default="email")
    enabled: bool = False
    verified: bool = False
    settings: Optional[Dict[str, Any]] = None
