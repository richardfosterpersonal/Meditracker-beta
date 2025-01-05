from app import db
from datetime import datetime
from typing import Optional

class Interaction(db.Model):
    """Model for medication interactions."""
    __tablename__ = 'interactions'

    id = db.Column(db.Integer, primary_key=True)
    medication1_id = db.Column(db.Integer, db.ForeignKey('medications.id'), nullable=False)
    medication2_id = db.Column(db.Integer, db.ForeignKey('medications.id'), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # severe, moderate, mild, monitor
    description = db.Column(db.Text, nullable=False)
    min_spacing_hours = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source = db.Column(db.String(50))  # e.g., 'FDA', 'DrugBank', 'Custom'
    reference_link = db.Column(db.String(255))
    
    # Relationships
    medication1 = db.relationship('Medication', foreign_keys=[medication1_id],
                                backref=db.backref('interactions_as_med1', lazy='dynamic'))
    medication2 = db.relationship('Medication', foreign_keys=[medication2_id],
                                backref=db.backref('interactions_as_med2', lazy='dynamic'))

    def __init__(self, medication1_id: int, medication2_id: int, severity: str,
                 description: str, min_spacing_hours: Optional[int] = None,
                 source: Optional[str] = None, reference_link: Optional[str] = None):
        self.medication1_id = medication1_id
        self.medication2_id = medication2_id
        self.severity = severity
        self.description = description
        self.min_spacing_hours = min_spacing_hours
        self.source = source
        self.reference_link = reference_link

    def to_dict(self) -> dict:
        """Convert interaction to dictionary."""
        return {
            'id': self.id,
            'medication1_id': self.medication1_id,
            'medication2_id': self.medication2_id,
            'severity': self.severity,
            'description': self.description,
            'min_spacing_hours': self.min_spacing_hours,
            'source': self.source,
            'reference_link': self.reference_link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def get_interaction(med1_id: int, med2_id: int) -> Optional['Interaction']:
        """Get interaction between two medications."""
        return Interaction.query.filter(
            ((Interaction.medication1_id == med1_id) & 
             (Interaction.medication2_id == med2_id)) |
            ((Interaction.medication1_id == med2_id) & 
             (Interaction.medication2_id == med1_id))
        ).first()

    @staticmethod
    def create_interaction(med1_id: int, med2_id: int, severity: str,
                         description: str, min_spacing_hours: Optional[int] = None,
                         source: Optional[str] = None,
                         reference_link: Optional[str] = None) -> 'Interaction':
        """Create a new interaction between medications."""
        interaction = Interaction(
            medication1_id=med1_id,
            medication2_id=med2_id,
            severity=severity,
            description=description,
            min_spacing_hours=min_spacing_hours,
            source=source,
            reference_link=reference_link
        )
        db.session.add(interaction)
        db.session.commit()
        return interaction

    def __repr__(self) -> str:
        return f'<Interaction {self.id}: {self.severity} between medications {self.medication1_id} and {self.medication2_id}>'
