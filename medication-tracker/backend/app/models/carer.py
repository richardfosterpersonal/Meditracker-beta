from app import db
from datetime import datetime

class Carer(db.Model):
    """
    Represents a carer in the system.
    This is an interim implementation that will be refactored in Phase 2.
    """
    __tablename__ = 'carers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'family', 'professional'
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='carer_profile', lazy=True)
    assignments = db.relationship('CarerAssignment', backref='carer', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'verified': self.verified,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class CarerAssignment(db.Model):
    """
    Links carers to patients with specific permissions.
    This is an interim implementation that will be refactored in Phase 2.
    """
    __tablename__ = 'carer_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    carer_id = db.Column(db.Integer, db.ForeignKey('carers.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    permissions = db.Column(db.JSON, nullable=False, default=lambda: {
        'view_medications': True,
        'view_compliance': True,
        'receive_alerts': True,
        'emergency_contact': False,
        'modify_schedule': False
    })
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = db.relationship('User', backref='carer_assignments', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'carer_id': self.carer_id,
            'patient_id': self.patient_id,
            'permissions': self.permissions,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
