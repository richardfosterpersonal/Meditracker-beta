"""
Custom Medication Model
Last Updated: 2024-12-25T21:15:45+01:00
Status: CRITICAL
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This model implements critical path requirements for medications:
1. Data Safety: Medication validation
2. User Safety: Dosage validation
3. System Stability: Consistency checks
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class CustomMedication(Base):
    """
    Custom Medication Model
    Critical Path: Core Medication Management
    """
    __tablename__ = 'custom_medications'
    
    # Critical Path: Data Integrity
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    frequency = Column(Integer, nullable=False)
    interval_hours = Column(Integer, nullable=False)
    
    # Critical Path: Safety Data
    interactions = Column(JSON, nullable=True)
    contraindications = Column(JSON, nullable=True)
    side_effects = Column(JSON, nullable=True)
    
    # Critical Path: Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="custom_medications")
    schedules = relationship("MedicationSchedule", back_populates="medication")

    def __init__(self, **kwargs):
        """Initialize with validation."""
        super().__init__(**kwargs)
        self.validate()

    def validate(self):
        """
        Validate medication data
        Critical Path: Data Safety
        """
        from app.validation.medication_safety import MedicationSafetyValidator
        
        validator = MedicationSafetyValidator()
        result = validator.validate({
            'dosage': {
                'amount': self.dosage,
                'unit': self.unit
            },
            'schedule': {
                'frequency': self.frequency,
                'interval_hours': self.interval_hours
            }
        })
        
        if not result['is_valid']:
            raise ValueError(f"Medication validation failed: {result['errors']}")

    def to_dict(self):
        """
        Convert to dictionary
        Critical Path: Data Integrity
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'dosage': self.dosage,
            'unit': self.unit,
            'frequency': self.frequency,
            'interval_hours': self.interval_hours,
            'interactions': self.interactions,
            'contraindications': self.contraindications,
            'side_effects': self.side_effects,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
