from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime

from ..models.base import Base

class MedicationModel(Base):
    """SQLAlchemy model for medications."""
    __tablename__ = 'medications'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    dosage = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    frequency = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("UserModel", back_populates="medications")
    schedules = relationship("ScheduleModel", back_populates="medication", cascade="all, delete-orphan")
    notifications = relationship("NotificationModel", back_populates="medication", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Medication(name={self.name}, dosage={self.dosage}{self.unit}, frequency={self.frequency})>"
