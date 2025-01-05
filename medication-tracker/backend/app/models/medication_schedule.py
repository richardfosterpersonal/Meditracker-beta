"""
Medication Schedule Model
Last Updated: 2024-12-25T20:25:06+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This model implements critical path requirements for medication scheduling:
1. Data Safety: Schedule validation
2. User Safety: Timing validation
3. System Stability: Consistency checks
"""

from datetime import datetime, time
from sqlalchemy import Column, Integer, Time, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.validation import DataValidator, SafetyChecker

class MedicationSchedule(Base):
    """
    Medication Schedule Model
    Critical Path: Core Schedule Management
    """
    __tablename__ = 'medication_schedules'
    
    # Critical Path: Data Integrity
    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey('custom_medications.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Critical Path: Schedule Safety
    time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Critical Path: Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_taken_at = Column(DateTime, nullable=True)
    
    # Critical Path: Data Relations
    medication = relationship("CustomMedication", back_populates="schedules")
    user = relationship("User", back_populates="schedules")
    
    def __init__(self, **kwargs):
        """Initialize with validation."""
        # Critical Path: Data Validation
        self._validate_schedule_data(kwargs)
        super().__init__(**kwargs)
    
    @staticmethod
    def _validate_schedule_data(data):
        """
        Validate schedule data.
        Critical Path: Schedule Safety
        """
        if 'time' in data:
            if not isinstance(data['time'], time):
                try:
                    # Convert string time to time object
                    time_parts = data['time'].split(':')
                    data['time'] = time(int(time_parts[0]), int(time_parts[1]))
                except Exception as e:
                    raise ValueError(f"Invalid time format: {str(e)}")
        
        # Critical Path: Safety Check
        SafetyChecker.check_schedule_safety(data)
    
    def update(self, **kwargs):
        """Update with validation."""
        # Critical Path: Data Validation
        self._validate_schedule_data(kwargs)
        
        # Critical Path: Audit Trail
        kwargs['updated_at'] = datetime.utcnow()
        
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def record_taken(self):
        """
        Record medication taken.
        Critical Path: User Safety
        """
        self.last_taken_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert to dictionary with validation."""
        return {
            'id': self.id,
            'medication_id': self.medication_id,
            'user_id': self.user_id,
            'time': self.time.strftime('%H:%M'),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_taken_at': self.last_taken_at.isoformat() if self.last_taken_at else None
        }
    
    @staticmethod
    def from_dict(data):
        """Create from dictionary with validation."""
        # Critical Path: Data Validation
        MedicationSchedule._validate_schedule_data(data)
        return MedicationSchedule(**data)
