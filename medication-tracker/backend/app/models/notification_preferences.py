from .. import db
from datetime import time, datetime
import pytz

class NotificationPreferences(db.Model):
    __tablename__ = 'notification_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # General notification settings
    email_notifications = db.Column(db.Boolean, default=True)
    browser_notifications = db.Column(db.Boolean, default=True)
    notification_sound = db.Column(db.Boolean, default=True)
    
    # Timing preferences
    quiet_hours_start = db.Column(db.Time, default=time(22, 0))  # 10 PM
    quiet_hours_end = db.Column(db.Time, default=time(8, 0))    # 8 AM
    reminder_advance_minutes = db.Column(db.Integer, default=30)
    
    # Notification types
    notify_upcoming_doses = db.Column(db.Boolean, default=True)
    notify_missed_doses = db.Column(db.Boolean, default=True)
    notify_refill_reminders = db.Column(db.Boolean, default=True)
    notify_interactions = db.Column(db.Boolean, default=True)
    
    # Reminder settings
    max_daily_reminders = db.Column(db.Integer, default=10)
    reminder_frequency_minutes = db.Column(db.Integer, default=30)
    
    # Refill settings
    refill_reminder_days_before = db.Column(db.Integer, default=7)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('notification_preferences', uselist=False))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email_notifications': self.email_notifications,
            'browser_notifications': self.browser_notifications,
            'notification_sound': self.notification_sound,
            'quiet_hours_start': self.quiet_hours_start.strftime('%H:%M') if self.quiet_hours_start else None,
            'quiet_hours_end': self.quiet_hours_end.strftime('%H:%M') if self.quiet_hours_end else None,
            'reminder_advance_minutes': self.reminder_advance_minutes,
            'notify_upcoming_doses': self.notify_upcoming_doses,
            'notify_missed_doses': self.notify_missed_doses,
            'notify_refill_reminders': self.notify_refill_reminders,
            'notify_interactions': self.notify_interactions,
            'max_daily_reminders': self.max_daily_reminders,
            'reminder_frequency_minutes': self.reminder_frequency_minutes,
            'refill_reminder_days_before': self.refill_reminder_days_before
        }

    @staticmethod
    def get_default_preferences(user_id):
        return NotificationPreferences(
            user_id=user_id,
            email_notifications=True,
            browser_notifications=True,
            notification_sound=True,
            quiet_hours_start=time(22, 0),
            quiet_hours_end=time(8, 0),
            reminder_advance_minutes=30,
            notify_upcoming_doses=True,
            notify_missed_doses=True,
            notify_refill_reminders=True,
            notify_interactions=True,
            max_daily_reminders=10,
            reminder_frequency_minutes=30,
            refill_reminder_days_before=7
        )

    def is_enabled(self, notification_type):
        """Check if a specific notification type is enabled"""
        if not self.email_notifications and not self.browser_notifications:
            return False

        notification_type_map = {
            'UPCOMING_DOSE': self.notify_upcoming_doses,
            'MISSED_DOSE': self.notify_missed_doses,
            'REFILL_REMINDER': self.notify_refill_reminders,
            'INTERACTION_WARNING': self.notify_interactions
        }

        return notification_type_map.get(notification_type, False)

    def should_send_now(self):
        """Check if notifications should be sent based on quiet hours"""
        if not (self.quiet_hours_start and self.quiet_hours_end):
            return True

        # Get user's timezone from associated user
        user_tz = pytz.timezone(self.user.timezone)
        current_time = datetime.utcnow().astimezone(user_tz).time()

        if self.quiet_hours_start <= self.quiet_hours_end:
            # Normal case: quiet hours within same day
            return not (self.quiet_hours_start <= current_time <= self.quiet_hours_end)
        else:
            # Special case: quiet hours span midnight
            return not (current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end)
