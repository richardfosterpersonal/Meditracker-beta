"""
Beta Tester Model
Last Updated: 2025-01-01T19:42:11+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This model implements critical path requirements for beta testers:
1. Data Safety: User validation
2. System Stability: Access control
3. Feedback Chain: Monitoring
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class BetaTesterStatus(enum.Enum):
    """Status of a beta tester"""
    INVITED = "invited"
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"

class BetaTesterRole(enum.Enum):
    """Role of a beta tester"""
    USER = "user"
    CARER = "carer"
    HEALTHCARE_PROVIDER = "healthcare_provider"
    PHARMACIST = "pharmacist"

class BetaTester(Base):
    """Beta Tester Model"""
    __tablename__ = 'beta_testers'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(SQLEnum(BetaTesterStatus), nullable=False, default=BetaTesterStatus.INVITED)
    role = Column(SQLEnum(BetaTesterRole), nullable=False)
    invite_code = Column(String(50), nullable=False, unique=True)
    invite_sent_at = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, nullable=True)
    last_active_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    feedback_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="beta_tester")
    feedback = relationship("BetaFeedback", back_populates="tester")
    metrics = relationship("BetaMetric", back_populates="tester")
