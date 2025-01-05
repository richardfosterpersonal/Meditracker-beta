"""
Beta Monitoring
Monitors beta testing progress and metrics
Last Updated: 2025-01-02T12:43:13+01:00
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import psutil
import time
import aiohttp

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import Session, relationship
from backend.app.database import Base, get_db
from .beta_settings import BetaSettings

class BetaPhase(Base):
    """Beta testing phase"""
    __tablename__ = 'beta_phases'
    
    phase_id = Column(String(50), primary_key=True)
    name = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    # Relationships
    validations = relationship("BetaValidation", back_populates="phase")
    metrics = relationship("BetaMetric", back_populates="phase")

class BetaValidation(Base):
    """Beta validation record"""
    __tablename__ = 'beta_validations'
    
    validation_id = Column(String(50), primary_key=True)
    phase_id = Column(String(50), ForeignKey('beta_phases.phase_id'), nullable=False)
    component = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    phase = relationship("BetaPhase", back_populates="validations")
    evidence = relationship("BetaEvidence", back_populates="validation")

class BetaMetric(Base):
    """Beta metric record"""
    __tablename__ = 'beta_metrics'
    
    metric_id = Column(String(50), primary_key=True)
    phase_id = Column(String(50), ForeignKey('beta_phases.phase_id'), nullable=False)
    name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    phase = relationship("BetaPhase", back_populates="metrics")

class BetaEvidence(Base):
    """Beta evidence record"""
    __tablename__ = 'beta_evidence'
    
    evidence_id = Column(String(50), primary_key=True)
    validation_id = Column(String(50), ForeignKey('beta_validations.validation_id'), nullable=False)
    type = Column(String(50), nullable=False)
    path = Column(String(255), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    validation = relationship("BetaValidation", back_populates="evidence")

class BetaMonitoring:
    """
    Monitors beta testing progress and metrics
    Tracks validation status and critical path alignment
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
    
    async def record_validation(
        self,
        phase_id: str,
        validation_id: str,
        component: str,
        status: str
    ) -> Dict:
        """Record a validation result"""
        try:
            db = next(get_db())
            
            # Create validation record
            validation = BetaValidation(
                validation_id=validation_id,
                phase_id=phase_id,
                component=component,
                status=status
            )
            
            db.add(validation)
            db.commit()
            
            return {
                "success": True,
                "validation_id": validation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to record validation: {str(e)}")
            return {
                "success": False,
                "error": "Failed to record validation",
                "details": str(e)
            }
            
    async def record_metric(
        self,
        phase_id: str,
        name: str,
        value: float
    ) -> Dict:
        """Record a metric value"""
        try:
            db = next(get_db())
            
            # Generate metric ID
            metric_id = f"METRIC-{phase_id}-{name}-{datetime.utcnow().timestamp()}"
            
            # Create metric record
            metric = BetaMetric(
                metric_id=metric_id,
                phase_id=phase_id,
                name=name,
                value=value
            )
            
            db.add(metric)
            db.commit()
            
            return {
                "success": True,
                "metric_id": metric_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to record metric: {str(e)}")
            return {
                "success": False,
                "error": "Failed to record metric",
                "details": str(e)
            }
            
    async def get_phase_metrics(self, phase_id: str) -> Dict:
        """Get metrics for a specific phase"""
        try:
            db = next(get_db())
            
            # Query metrics
            metrics = (
                db.query(BetaMetric)
                .filter(BetaMetric.phase_id == phase_id)
                .order_by(BetaMetric.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "metrics": [
                    {
                        "name": metric.name,
                        "value": metric.value,
                        "timestamp": metric.timestamp.isoformat()
                    }
                    for metric in metrics
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase metrics: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get phase metrics",
                "details": str(e)
            }
            
    async def get_phase_validations(self, phase_id: str) -> Dict:
        """Get validations for a specific phase"""
        try:
            db = next(get_db())
            
            # Query validations
            validations = (
                db.query(BetaValidation)
                .filter(BetaValidation.phase_id == phase_id)
                .order_by(BetaValidation.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "validations": [
                    {
                        "validation_id": validation.validation_id,
                        "component": validation.component,
                        "status": validation.status,
                        "timestamp": validation.timestamp.isoformat()
                    }
                    for validation in validations
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase validations: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get phase validations",
                "details": str(e)
            }
            
    async def get_validation_status(self, phase_id: str) -> Dict:
        """Get validation status for a phase"""
        try:
            db = next(get_db())
            
            # Query validation status
            validations = (
                db.query(BetaValidation)
                .filter(BetaValidation.phase_id == phase_id)
                .order_by(BetaValidation.timestamp.desc())
                .all()
            )
            
            return {
                "success": True,
                "phase_id": phase_id,
                "validations": [
                    {
                        "component": validation.component,
                        "status": validation.status,
                        "timestamp": validation.timestamp.isoformat()
                    }
                    for validation in validations
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get validation status: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get validation status",
                "details": str(e)
            }

    async def collect_health_metrics(self) -> Dict:
        """Collect comprehensive health metrics"""
        try:
            db = next(get_db())
            
            # Get latest metrics for each category
            metrics = {}
            
            # Uptime metrics
            uptime_metric = (
                db.query(BetaMetric)
                .filter(BetaMetric.name == 'uptime_percentage')
                .order_by(BetaMetric.timestamp.desc())
                .first()
            )
            metrics["uptime_percentage"] = uptime_metric.value if uptime_metric else 0
            
            # Error rate metrics
            error_rate_metric = (
                db.query(BetaMetric)
                .filter(BetaMetric.name == 'error_rate')
                .order_by(BetaMetric.timestamp.desc())
                .first()
            )
            metrics["error_rate"] = error_rate_metric.value if error_rate_metric else 1
            
            # API response time metrics
            api_response_time_metric = (
                db.query(BetaMetric)
                .filter(BetaMetric.name == 'api_p95_response')
                .order_by(BetaMetric.timestamp.desc())
                .first()
            )
            metrics["api_p95_response"] = api_response_time_metric.value if api_response_time_metric else 1000
            
            # Data integrity metrics
            data_integrity_metric = (
                db.query(BetaMetric)
                .filter(BetaMetric.name == 'data_integrity_score')
                .order_by(BetaMetric.timestamp.desc())
                .first()
            )
            metrics["data_integrity_score"] = data_integrity_metric.value if data_integrity_metric else 0
            
            return {
                "success": True,
                "metrics": metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect health metrics: {str(e)}")
            return {
                "success": False,
                "error": "Failed to collect health metrics",
                "details": str(e)
            }
            
    async def record_health_metric(
        self,
        name: str,
        value: float,
        phase_id: str = "BETA_HEALTH"
    ) -> Dict:
        """Record a health-related metric"""
        return await self.record_metric(phase_id, name, value)

    async def validate_beta_monitoring(self) -> Dict:
        """Validate beta monitoring system readiness"""
        try:
            # Check database connectivity
            try:
                db = next(get_db())
                db.execute("SELECT 1")
            except Exception as e:
                return {
                    "requirement": "BETA_MONITORING_READY",
                    "status": "FAILED",
                    "priority": "CRITICAL",
                    "validation_type": "MONITORING",
                    "scope": "SYSTEM",
                    "message": f"Database connectivity failed: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "corrective_action": "Fix database connection"
                }
                
            # Check required directories
            beta_dir = Path("data/beta")
            metrics_dir = beta_dir / "metrics"
            logs_dir = beta_dir / "logs"
            
            if not all(d.exists() for d in [beta_dir, metrics_dir, logs_dir]):
                return {
                    "requirement": "BETA_MONITORING_READY",
                    "status": "FAILED",
                    "priority": "HIGH",
                    "validation_type": "MONITORING",
                    "scope": "SYSTEM",
                    "message": "Required monitoring directories not found",
                    "timestamp": datetime.utcnow().isoformat(),
                    "corrective_action": "Initialize monitoring directories"
                }
                
            # Check active phase exists
            active_phase = db.query(BetaPhase).filter(
                BetaPhase.status == 'active'
            ).first()
            
            if not active_phase:
                return {
                    "requirement": "BETA_MONITORING_READY",
                    "status": "FAILED",
                    "priority": "HIGH",
                    "validation_type": "MONITORING",
                    "scope": "SYSTEM",
                    "message": "No active beta phase found",
                    "timestamp": datetime.utcnow().isoformat(),
                    "corrective_action": "Initialize beta phase"
                }
                
            # Check recent metrics
            recent_metrics = db.query(BetaMetric).filter(
                BetaMetric.timestamp >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            if recent_metrics == 0:
                return {
                    "requirement": "BETA_MONITORING_READY",
                    "status": "FAILED",
                    "priority": "HIGH",
                    "validation_type": "MONITORING",
                    "scope": "SYSTEM",
                    "message": "No recent metrics collected",
                    "timestamp": datetime.utcnow().isoformat(),
                    "corrective_action": "Initialize metrics collection"
                }
                
            # Collect initial metrics
            try:
                await self.monitor_beta_health()
            except Exception as e:
                return {
                    "requirement": "BETA_MONITORING_READY",
                    "status": "FAILED",
                    "priority": "HIGH",
                    "validation_type": "MONITORING",
                    "scope": "SYSTEM",
                    "message": f"Failed to collect initial metrics: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "corrective_action": "Fix metrics collection"
                }
                
            return {
                "requirement": "BETA_MONITORING_READY",
                "status": "PASSED",
                "priority": "HIGH",
                "validation_type": "MONITORING",
                "scope": "SYSTEM",
                "message": "Beta monitoring validation passed",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "requirement": "BETA_MONITORING_READY",
                "status": "FAILED",
                "priority": "CRITICAL",
                "validation_type": "MONITORING",
                "scope": "SYSTEM",
                "message": f"Beta monitoring validation failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
                "corrective_action": "Fix monitoring system error"
            }
            
    async def monitor_beta_health(self) -> None:
        """Monitor beta system health metrics"""
        try:
            db = next(get_db())
            active_phase = db.query(BetaPhase).filter(
                BetaPhase.status == 'active'
            ).first()
            
            if not active_phase:
                logger.error("No active beta phase found")
                return
                
            # System metrics
            cpu_metric = BetaMetric(
                id=f"metric_{datetime.utcnow().timestamp()}_cpu",
                phase_id=active_phase.id,
                name="cpu_usage",
                value=psutil.cpu_percent()
            )
            db.add(cpu_metric)
            
            memory_metric = BetaMetric(
                id=f"metric_{datetime.utcnow().timestamp()}_memory",
                phase_id=active_phase.id,
                name="memory_usage",
                value=psutil.virtual_memory().percent
            )
            db.add(memory_metric)
            
            # Database metrics
            db_size = Path(db.url.database).stat().st_size / (1024 * 1024)  # MB
            db_metric = BetaMetric(
                id=f"metric_{datetime.utcnow().timestamp()}_db",
                phase_id=active_phase.id,
                name="database_size_mb",
                value=db_size
            )
            db.add(db_metric)
            
            # API metrics
            api_time = await self._measure_api_response_time()
            if api_time >= 0:
                api_metric = BetaMetric(
                    id=f"metric_{datetime.utcnow().timestamp()}_api",
                    phase_id=active_phase.id,
                    name="api_response_time_ms",
                    value=api_time
                )
                db.add(api_metric)
                
            # Error rates
            error_rate = await self._calculate_error_rate()
            if error_rate >= 0:
                error_metric = BetaMetric(
                    id=f"metric_{datetime.utcnow().timestamp()}_errors",
                    phase_id=active_phase.id,
                    name="error_rate_percent",
                    value=error_rate
                )
                db.add(error_metric)
                
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to monitor beta health: {str(e)}")
            
    async def _measure_api_response_time(self) -> float:
        """Measure API response time"""
        try:
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:8000/health") as response:
                    await response.text()
            return (time.time() - start_time) * 1000  # Convert to milliseconds
        except Exception:
            return -1
            
    async def _calculate_error_rate(self) -> float:
        """Calculate error rate from recent logs"""
        try:
            db = next(get_db())
            total_validations = db.query(BetaValidation).filter(
                BetaValidation.timestamp >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            failed_validations = db.query(BetaValidation).filter(
                BetaValidation.timestamp >= datetime.utcnow() - timedelta(hours=1),
                BetaValidation.status == "failed"
            ).count()
            
            if total_validations == 0:
                return 0
                
            return (failed_validations / total_validations) * 100
            
        except Exception:
            return -1
