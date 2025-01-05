"""
Beta Testing Database Models
Last Updated: 2025-01-01T21:54:25+01:00
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship

from ..database import Base
from ..core.beta_feedback import FeedbackType, FeedbackPriority, FeedbackStatus

class BetaPhase(Base):
    """Beta testing phase"""
    __tablename__ = 'beta_phases'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default='inactive')  # active, inactive, completed
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    metrics = relationship("BetaMetric", back_populates="phase")
    validations = relationship("BetaValidation", back_populates="phase")
    
class BetaMetric(Base):
    """Beta testing metrics"""
    __tablename__ = 'beta_metrics'
    
    id = Column(String, primary_key=True)
    phase_id = Column(String, ForeignKey('beta_phases.id'))
    name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    phase = relationship("BetaPhase", back_populates="metrics")
    
class BetaValidation(Base):
    """Beta validation results"""
    __tablename__ = 'beta_validations'
    
    id = Column(String, primary_key=True)
    phase_id = Column(String, ForeignKey('beta_phases.id'))
    requirement = Column(String, nullable=False)
    status = Column(String, nullable=False)  # passed, failed, in_progress
    priority = Column(String, nullable=False)
    validation_type = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    message = Column(String)
    corrective_action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    phase = relationship("BetaPhase", back_populates="validations")
    
class BetaFeedback(Base):
    """Beta user feedback"""
    __tablename__ = 'beta_feedback'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    feature = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(FeedbackType), nullable=False)
    priority = Column(Enum(FeedbackPriority), nullable=False)
    status = Column(Enum(FeedbackStatus), nullable=False)
    resolution = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolution_time = Column(DateTime)
    
class BetaFeatureUsage(Base):
    """Beta feature usage tracking"""
    __tablename__ = 'beta_feature_usage'
    
    id = Column(String, primary_key=True)
    feature = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    success = Column(Integer, default=1)  # 1 for success, 0 for failure
    error = Column(String)  # Error message if failure
    
class BetaError(Base):
    """Beta error tracking"""
    __tablename__ = 'beta_errors'
    
    id = Column(String, primary_key=True)
    feature = Column(String, nullable=False)
    error = Column(String, nullable=False)
    user_id = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Integer, default=0)  # 0 for unresolved, 1 for resolved
    resolution = Column(String)
    resolution_time = Column(DateTime)
