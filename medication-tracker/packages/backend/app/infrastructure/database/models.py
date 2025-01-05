from datetime import datetime
from typing import Dict, Any
import json
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean,
    ForeignKey, JSON, Text, Float, Table
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    email_verified = Column(Boolean, default=False)
    notification_preferences = Column(JSON, default={})
    push_subscription = Column(Text)
    last_login = Column(DateTime, default=datetime.utcnow)
    is_admin = Column(Boolean, default=False)
    is_carer = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync = Column(DateTime, nullable=True)

    medications = relationship("Medication", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    carer_profile = relationship("Carer", back_populates="user", uselist=False)

class Medication(Base):
    __tablename__ = 'medications'

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    dosage = Column(JSON, nullable=False)
    schedule = Column(JSON, nullable=False)
    category = Column(String(100))
    instructions = Column(Text)
    is_prn = Column(Boolean, default=False)
    min_hours_between_doses = Column(Integer)
    max_daily_doses = Column(Integer)
    reason_for_taking = Column(String(200))
    remaining_doses = Column(Integer)
    last_taken = Column(DateTime)
    daily_doses_taken = Column(Integer, default=0)
    daily_doses_reset_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="medications")
    doses = relationship("MedicationDose", back_populates="medication")

class MedicationDose(Base):
    __tablename__ = 'medication_doses'

    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey('medications.id'), nullable=False)
    taken_at = Column(DateTime, nullable=False)
    recorded_by_id = Column(Integer, ForeignKey('users.id'))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    medication = relationship("Medication", back_populates="doses")
    recorded_by = relationship("User")

class Carer(Base):
    __tablename__ = 'carers'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    type = Column(String(50), nullable=False)
    verified = Column(Boolean, default=False)
    qualifications = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="carer_profile")
    assignments = relationship("CarerAssignment", back_populates="carer")

class CarerAssignment(Base):
    __tablename__ = 'carer_assignments'

    id = Column(Integer, primary_key=True)
    carer_id = Column(Integer, ForeignKey('carers.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    permissions = Column(JSON, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    carer = relationship("Carer", back_populates="assignments")
    patient = relationship("User")

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True)
    type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON)
    read = Column(Boolean, default=False)
    sent = Column(Boolean, default=False)
    error = Column(Text)
    sent_at = Column(DateTime)
    read_at = Column(DateTime)
    urgency = Column(String(20), default='normal')
    action_required = Column(Boolean, default=False)
    action_type = Column(String(50))
    action_data = Column(JSON)
    carer_id = Column(Integer, ForeignKey('carers.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    carer = relationship("Carer")

class NotificationSchedule(Base):
    __tablename__ = 'notification_schedules'

    id = Column(Integer, primary_key=True)
    notification_type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    data = Column(JSON)
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)
    recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(100))
    next_schedule = Column(DateTime)
    carer_id = Column(Integer, ForeignKey('carers.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    carer = relationship("Carer")
