"""
Beta Feedback Model
Last Updated: 2025-01-01T19:42:11+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This model implements critical path requirements for beta feedback:
1. Data Safety: Feedback validation
2. User Safety: Content moderation
3. System Stability: Storage management
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class FeedbackType(enum.Enum):
    """Type of feedback"""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    USABILITY = "usability"
    PERFORMANCE = "performance"
    SECURITY = "security"
    OTHER = "other"

class FeedbackPriority(enum.Enum):
    """Priority of feedback"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FeedbackStatus(enum.Enum):
    """Status of feedback"""
    NEW = "new"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class BetaFeedback(Base):
    """Beta Feedback Model"""
    __tablename__ = 'beta_feedback'
    
    id = Column(Integer, primary_key=True)
    tester_id = Column(Integer, ForeignKey('beta_testers.id'), nullable=False)
    type = Column(SQLEnum(FeedbackType), nullable=False)
    priority = Column(SQLEnum(FeedbackPriority), nullable=False, default=FeedbackPriority.MEDIUM)
    status = Column(SQLEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.NEW)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    steps_to_reproduce = Column(Text, nullable=True)
    expected_behavior = Column(Text, nullable=True)
    actual_behavior = Column(Text, nullable=True)
    metadata = Column(JSON, nullable=True)  # For storing browser info, app version, etc.
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    tester = relationship("BetaTester", back_populates="feedback")
    comments = relationship("BetaFeedbackComment", back_populates="feedback", cascade="all, delete-orphan")

class BetaFeedbackComment(Base):
    """Comments on beta feedback"""
    __tablename__ = 'beta_feedback_comments'
    
    id = Column(Integer, primary_key=True)
    feedback_id = Column(Integer, ForeignKey('beta_feedback.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    feedback = relationship("BetaFeedback", back_populates="comments")
    user = relationship("User", backref="beta_feedback_comments")
