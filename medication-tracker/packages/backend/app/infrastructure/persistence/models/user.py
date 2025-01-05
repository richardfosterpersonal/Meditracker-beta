from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class UserModel(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False)
    notification_preferences = Column(JSON, nullable=False)
    push_subscription = Column(String(1024), nullable=True)
    last_login = Column(DateTime, default=datetime.utcnow)
    is_admin = Column(Boolean, default=False)
    is_carer = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    carer = relationship("CarerModel", back_populates="user", uselist=False)

class CarerModel(Base):
    __tablename__ = 'carers'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    type = Column(String(50), nullable=False)
    verified = Column(Boolean, default=False)
    qualifications = Column(JSON, nullable=True)
    patients = Column(JSON, nullable=False)  # List of patient user IDs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("UserModel", back_populates="carer")
    assignments = relationship("CarerAssignmentModel", back_populates="carer")

class CarerAssignmentModel(Base):
    __tablename__ = 'carer_assignments'

    id = Column(Integer, primary_key=True)
    carer_id = Column(Integer, ForeignKey('carers.id'))
    patient_id = Column(Integer, ForeignKey('users.id'))
    permissions = Column(JSON, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    carer = relationship("CarerModel", back_populates="assignments")
    patient = relationship("UserModel", foreign_keys=[patient_id])
