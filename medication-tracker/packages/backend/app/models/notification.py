from datetime import datetime
from .. import db
from sqlalchemy.dialects.postgresql import JSON
from pydantic import BaseModel
from typing import Dict, List, Optional

class NotificationStatus:
    """Notification status constants"""
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"

class NotificationLog(BaseModel):
    """Notification log model"""
    notification_id: str
    user_id: str
    title: str
    body: str
    tokens: List[str]
    data: Optional[Dict] = None
    status: str = NotificationStatus.PENDING
    created_at: datetime
    updated_at: datetime
    attempts: int = 1
    success_count: int = 0
    failure_count: int = 0
    failed_tokens: List[str] = []
    error_details: Optional[str] = None
    
    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id'))
    
    type = db.Column(db.String(50), nullable=False)  # 'UPCOMING_DOSE', 'MISSED_DOSE', 'REFILL_REMINDER', 'INTERACTION_WARNING'
    status = db.Column(db.String(20), nullable=False, default=NotificationStatus.PENDING)  # 'PENDING', 'SENT', 'DELIVERED', 'FAILED'
    priority = db.Column(db.String(20), nullable=False, default='normal')  # 'normal', 'high'
    error_message = db.Column(db.String(255))
    
    data = db.Column(JSON)  # Stores notification-specific data like medication details or interaction pairs
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    scheduled_time = db.Column(db.DateTime, nullable=False)
    sent_at = db.Column(db.DateTime)
    acknowledged_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('notifications', lazy=True))
    medication = db.relationship('Medication', backref=db.backref('notifications', lazy=True))

    def __repr__(self):
        return f'<Notification {self.id} - {self.type} - {self.status}>'

    def to_dict(self):
        notification_dict = {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'status': self.status,
            'priority': self.priority,
            'data': self.data,
            'created_at': self.created_at.isoformat(),
            'scheduled_time': self.scheduled_time.isoformat(),
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None
        }

        if self.medication_id:
            notification_dict['medication'] = {
                'id': self.medication.id,
                'name': self.medication.name,
                'dosage': self.medication.dosage
            }

        return notification_dict

    @staticmethod
    def get_pending_notifications(user_id):
        """Get all pending notifications for a user"""
        return Notification.query.filter(
            Notification.user_id == user_id,
            Notification.status == NotificationStatus.PENDING,
            Notification.scheduled_time <= datetime.utcnow()
        ).all()

    @staticmethod
    def get_user_notifications(user_id, notification_type=None, status=None, limit=50):
        """Get notifications for a user with optional filters"""
        query = Notification.query.filter(Notification.user_id == user_id)
        
        if notification_type:
            query = query.filter(Notification.type == notification_type)
        
        if status:
            query = query.filter(Notification.status == status)
        
        return query.order_by(Notification.scheduled_time.desc()).limit(limit).all()

    @staticmethod
    def create_upcoming_dose_notification(user_id, medication, scheduled_time):
        """Create a notification for an upcoming medication dose"""
        notification = Notification(
            user_id=user_id,
            medication_id=medication.id,
            type='UPCOMING_DOSE',
            status=NotificationStatus.PENDING,
            priority='normal',
            scheduled_time=scheduled_time,
            data={
                'medication_name': medication.name,
                'dosage': medication.dosage,
                'instructions': medication.instructions,
                'schedule_time': scheduled_time.isoformat()
            }
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def create_missed_dose_notification(user_id, medication, scheduled_time):
        """Create a notification for a missed medication dose"""
        notification = Notification(
            user_id=user_id,
            medication_id=medication.id,
            type='MISSED_DOSE',
            status=NotificationStatus.PENDING,
            priority='high',
            scheduled_time=datetime.utcnow(),  # Send immediately
            data={
                'medication_name': medication.name,
                'dosage': medication.dosage,
                'scheduled_time': scheduled_time.isoformat(),
                'minutes_late': int((datetime.utcnow() - scheduled_time).total_seconds() / 60)
            }
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def create_refill_reminder(user_id, medication):
        """Create a notification for medication refill"""
        notification = Notification(
            user_id=user_id,
            medication_id=medication.id,
            type='REFILL_REMINDER',
            status=NotificationStatus.PENDING,
            priority='normal',
            scheduled_time=datetime.utcnow(),  # Send immediately
            data={
                'medication_name': medication.name,
                'remaining_doses': medication.remaining_doses,
                'days_left': medication.days_until_refill_needed()
            }
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def create_interaction_warning(user_id, medications):
        """Create a notification for medication interaction warning"""
        notification = Notification(
            user_id=user_id,
            type='INTERACTION_WARNING',
            status=NotificationStatus.PENDING,
            priority='high',
            scheduled_time=datetime.utcnow(),  # Send immediately
            data={
                'medications': [
                    {
                        'id': med.id,
                        'name': med.name,
                        'dosage': med.dosage
                    }
                    for med in medications
                ]
            }
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    def mark_as_sent(self):
        """Mark the notification as sent"""
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()
        db.session.commit()

    def mark_as_acknowledged(self):
        """Mark the notification as acknowledged by the user"""
        self.acknowledged_at = datetime.utcnow()
        db.session.commit()

    def mark_as_failed(self, error_message):
        """Mark the notification as failed with an error message"""
        self.status = NotificationStatus.FAILED
        self.error_message = error_message
        db.session.commit()

    def cancel(self):
        """Cancel a scheduled notification"""
        self.status = NotificationStatus.FAILED
        db.session.commit()

    def reschedule(self, new_time):
        """Reschedule a notification for a new time"""
        if self.status not in [NotificationStatus.PENDING, NotificationStatus.FAILED]:
            raise ValueError('Cannot reschedule a notification that has already been sent or cancelled')
        
        self.scheduled_time = new_time
        self.status = NotificationStatus.PENDING
        self.error_message = None
        db.session.commit()

    def should_send(self):
        """Check if the notification should be sent now"""
        if self.status != NotificationStatus.PENDING:
            return False
            
        if self.scheduled_time > datetime.utcnow():
            return False
            
        # Check user's notification preferences
        user_prefs = self.user.notification_preferences
        if not user_prefs:
            return True  # Default to sending if no preferences set
            
        return user_prefs.is_enabled(self.type) and user_prefs.should_send_now()
