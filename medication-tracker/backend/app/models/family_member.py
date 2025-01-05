from app import db
from datetime import datetime

class FamilyMember(db.Model):
    __tablename__ = 'family_members'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(50))
    email = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    emergency_contact = db.Column(db.Boolean, default=False)
    access_level = db.Column(db.String(20), default='view')  # view, edit, or none
    profile_picture = db.Column(db.String(200), nullable=True)  # URL to profile picture
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'relationship': self.relationship,
            'email': self.email,
            'phone': self.phone,
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'emergencyContact': self.emergency_contact,
            'accessLevel': self.access_level,
            'profilePicture': self.profile_picture,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
