from app import db
from datetime import datetime

class MedicationHistory(db.Model):
    __tablename__ = 'medication_history'

    id = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # 'taken', 'missed', 'skipped'
    scheduled_time = db.Column(db.DateTime, nullable=False)
    taken_time = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Add relationship to Medication model
    medication = db.relationship('Medication', backref=db.backref('history', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'medicationId': self.medication_id,
            'action': self.action,
            'scheduledTime': self.scheduled_time.isoformat(),
            'takenTime': self.taken_time.isoformat() if self.taken_time else None,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
