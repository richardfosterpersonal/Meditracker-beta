"""
Beta Metric Model
Last Updated: 2025-01-01T19:42:11+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This model implements critical path requirements for beta metrics:
1. Data Safety: Metric validation
2. System Stability: Performance monitoring
3. Critical Path: Success tracking
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class MetricType(enum.Enum):
    """Type of metric"""
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    USABILITY = "usability"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    ENGAGEMENT = "engagement"
    SATISFACTION = "satisfaction"

class MetricPriority(enum.Enum):
    """Priority of metric"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BetaMetric(Base):
    """Beta Metric Model"""
    __tablename__ = 'beta_metrics'
    
    id = Column(Integer, primary_key=True)
    tester_id = Column(Integer, ForeignKey('beta_testers.id'), nullable=False)
    type = Column(SQLEnum(MetricType), nullable=False)
    name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    priority = Column(SQLEnum(MetricPriority), nullable=False, default=MetricPriority.MEDIUM)
    metadata = Column(JSON, nullable=True)  # Additional context about the metric
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tester = relationship("BetaTester", back_populates="metrics")
