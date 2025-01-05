from datetime import datetime
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from app.domain.shared.base_entity import BaseEntity

@dataclass
class NotificationPreference:
    email_enabled: bool = False
    push_enabled: bool = False
    reminder_time: str = "09:00"
    timezone: str = "UTC"
    advance_notice: int = 30

@dataclass
class User(BaseEntity):
    name: str = field(default="")
    email: str = field(default="")
    password_hash: str = field(default="")
    email_verified: bool = field(default=False)
    notification_preferences: NotificationPreference = field(default_factory=NotificationPreference)
    is_admin: bool = field(default=False)
    is_carer: bool = field(default=False)
    push_subscription: Optional[str] = field(default=None)
    last_login: datetime = field(default_factory=datetime.utcnow)
    last_sync: Optional[datetime] = field(default=None)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def update_notification_preferences(self, preferences: Dict):
        self.notification_preferences = NotificationPreference(**preferences)
        self.update_timestamp()

    def update_push_subscription(self, subscription: str):
        self.push_subscription = subscription
        self.update_timestamp()

    def record_login(self):
        self.last_login = datetime.utcnow()
        self.update_timestamp()

    def record_sync(self):
        self.last_sync = datetime.utcnow()
        self.update_timestamp()

@dataclass
class Carer(BaseEntity):
    user_id: int = field(default=0)
    type: str = field(default="family")
    verified: bool = field(default=False)
    qualifications: Optional[Dict[str, str]] = field(default=None)
    patients: List[int] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def add_patient(self, patient_id: int):
        if patient_id not in self.patients:
            self.patients.append(patient_id)
            self.update_timestamp()

    def remove_patient(self, patient_id: int):
        if patient_id in self.patients:
            self.patients.remove(patient_id)
            self.update_timestamp()

@dataclass
class CarerAssignment(BaseEntity):
    carer_id: int = field(default=0)
    patient_id: int = field(default=0)
    permissions: Dict[str, bool] = field(default_factory=lambda: {
        'view_medications': True,
        'view_compliance': True,
        'receive_alerts': True,
        'emergency_contact': False,
        'modify_schedule': False
    })
    active: bool = True

    def update_permissions(self, new_permissions: Dict[str, bool]):
        self.permissions.update(new_permissions)
        self.update_timestamp()

    def deactivate(self):
        self.active = False
        self.update_timestamp()
