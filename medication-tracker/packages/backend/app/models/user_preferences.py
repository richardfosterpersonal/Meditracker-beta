from datetime import time
from typing import Dict, Any, Optional
from enum import Enum
from app.extensions import db

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"

class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timezone = db.Column(db.String(50), nullable=False, default='UTC')
    quiet_hours_start = db.Column(db.Time, nullable=True)
    quiet_hours_end = db.Column(db.Time, nullable=True)
    notification_channels = db.Column(db.JSON, nullable=False, default=list)
    notification_types = db.Column(db.JSON, nullable=False, default=dict)
    emergency_contact_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    language = db.Column(db.String(10), nullable=False, default='en')

    def __init__(
        self,
        user_id: int,
        timezone: str = 'UTC',
        quiet_hours_start: Optional[time] = None,
        quiet_hours_end: Optional[time] = None,
        notification_channels: Optional[list] = None,
        notification_types: Optional[Dict[str, Any]] = None,
        emergency_contact_id: Optional[int] = None,
        language: str = 'en'
    ):
        self.user_id = user_id
        self.timezone = timezone
        self.quiet_hours_start = quiet_hours_start
        self.quiet_hours_end = quiet_hours_end
        self.notification_channels = notification_channels or [
            NotificationChannel.EMAIL.value,
            NotificationChannel.IN_APP.value
        ]
        self.notification_types = notification_types or {
            'upcoming_dose': {
                'enabled': True,
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.IN_APP.value],
                'advance_minutes': 30
            },
            'missed_dose': {
                'enabled': True,
                'channels': [
                    NotificationChannel.EMAIL.value,
                    NotificationChannel.SMS.value,
                    NotificationChannel.IN_APP.value
                ],
                'delay_minutes': 30
            },
            'refill_needed': {
                'enabled': True,
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.IN_APP.value],
                'days_before': 7
            },
            'interaction_warning': {
                'enabled': True,
                'channels': [
                    NotificationChannel.EMAIL.value,
                    NotificationChannel.SMS.value,
                    NotificationChannel.IN_APP.value
                ]
            }
        }
        self.emergency_contact_id = emergency_contact_id
        self.language = language

    def is_quiet_hours(self, current_time: time) -> bool:
        """Check if the current time is within quiet hours"""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False

        if self.quiet_hours_start <= self.quiet_hours_end:
            return self.quiet_hours_start <= current_time <= self.quiet_hours_end
        else:  # Handles case where quiet hours span midnight
            return current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end

    def should_notify(self, notification_type: str, channel: str) -> bool:
        """Check if a notification should be sent based on preferences"""
        if notification_type not in self.notification_types:
            return False

        notification_config = self.notification_types[notification_type]
        return (
            notification_config.get('enabled', True) and
            channel in notification_config.get('channels', [])
        )

    def get_advance_notice(self, notification_type: str) -> int:
        """Get advance notice time in minutes for a notification type"""
        if notification_type not in self.notification_types:
            return 0

        notification_config = self.notification_types[notification_type]
        return notification_config.get('advance_minutes', 0)

    def update_preferences(self, preferences: Dict[str, Any]) -> None:
        """Update user preferences"""
        for key, value in preferences.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def to_dict(self) -> Dict[str, Any]:
        """Convert preferences to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'timezone': self.timezone,
            'quiet_hours_start': self.quiet_hours_start.strftime('%H:%M') if self.quiet_hours_start else None,
            'quiet_hours_end': self.quiet_hours_end.strftime('%H:%M') if self.quiet_hours_end else None,
            'notification_channels': self.notification_channels,
            'notification_types': self.notification_types,
            'emergency_contact_id': self.emergency_contact_id,
            'language': self.language
        }
