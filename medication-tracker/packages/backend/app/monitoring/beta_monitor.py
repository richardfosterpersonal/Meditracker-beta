"""
Beta Testing Monitor
Last Updated: 2024-12-25T12:02:50+01:00
Permission: IMPLEMENTATION
Reference: MASTER_CRITICAL_PATH.md
"""

from typing import Dict, List
from datetime import datetime
import logging
from prometheus_client import Counter, Gauge, Histogram
from dataclasses import dataclass

@dataclass
class SafetyMetric:
    component: str
    status: bool
    timestamp: datetime
    details: Dict

class BetaMonitor:
    """Monitors critical components during beta testing"""
    
    def __init__(self):
        self._setup_metrics()
        self._setup_logging()
    
    def _setup_metrics(self):
        """Setup essential monitoring metrics"""
        # Safety Metrics (HIGHEST)
        self.schedule_accuracy = Gauge(
            'beta_schedule_accuracy',
            'Medication schedule accuracy'
        )
        self.interaction_checks = Counter(
            'beta_interaction_checks',
            'Drug interaction checks performed'
        )
        self.safety_alerts = Counter(
            'beta_safety_alerts',
            'Safety alerts generated'
        )
        
        # Security Metrics (HIGH)
        self.security_status = Gauge(
            'beta_security_status',
            'Security compliance status'
        )
        
        # Performance Metrics (HIGH)
        self.response_time = Histogram(
            'beta_response_time',
            'API response time'
        )
    
    def _setup_logging(self):
        """Setup logging for beta monitoring"""
        self.logger = logging.getLogger('beta_monitor')
        self.logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        fh = logging.FileHandler('logs/beta_testing.log')
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)
    
    def monitor_safety(self, data: Dict) -> SafetyMetric:
        """Monitor medication safety components"""
        try:
            # Check schedule accuracy
            accuracy = data.get('schedule_accuracy', 0)
            self.schedule_accuracy.set(accuracy)
            
            # Track interaction checks
            if data.get('interaction_check'):
                self.interaction_checks.inc()
            
            # Monitor alerts
            if data.get('alert_generated'):
                self.safety_alerts.inc()
            
            metric = SafetyMetric(
                component='medication_safety',
                status=True,
                timestamp=datetime.now(),
                details=data
            )
            
            self.logger.info(
                f"Safety check completed: {accuracy}% accuracy"
            )
            
            return metric
            
        except Exception as e:
            self.logger.error(f"Safety monitoring error: {str(e)}")
            return SafetyMetric(
                component='medication_safety',
                status=False,
                timestamp=datetime.now(),
                details={'error': str(e)}
            )
    
    def monitor_security(self, data: Dict) -> SafetyMetric:
        """Monitor security components"""
        try:
            # Check security status
            status = data.get('security_status', 0)
            self.security_status.set(status)
            
            metric = SafetyMetric(
                component='security',
                status=True,
                timestamp=datetime.now(),
                details=data
            )
            
            self.logger.info(
                f"Security check completed: {status}% compliance"
            )
            
            return metric
            
        except Exception as e:
            self.logger.error(f"Security monitoring error: {str(e)}")
            return SafetyMetric(
                component='security',
                status=False,
                timestamp=datetime.now(),
                details={'error': str(e)}
            )
    
    def monitor_performance(self, response_time: float) -> None:
        """Monitor system performance"""
        try:
            self.response_time.observe(response_time)
            
            self.logger.info(
                f"Performance check: {response_time}s response time"
            )
            
        except Exception as e:
            self.logger.error(
                f"Performance monitoring error: {str(e)}"
            )
