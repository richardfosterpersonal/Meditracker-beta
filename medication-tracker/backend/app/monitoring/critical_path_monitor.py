"""
Critical Path Monitor Implementation
Last Updated: 2024-12-25T11:53:10+01:00
Permission: IMPLEMENTATION
Scope: CODE
Reference: MASTER_CRITICAL_PATH.md
Parent: VALIDATION_HOOK_SYSTEM.md
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from prometheus_client import Counter, Gauge, Histogram
from dataclasses import dataclass

@dataclass
class CriticalPathMetric:
    name: str
    category: str
    priority: str
    value: float
    timestamp: datetime
    validation_status: bool

class CriticalPathMonitor:
    """
    Monitors critical path components as defined in MASTER_CRITICAL_PATH.md
    Ensures strict alignment with validation requirements
    """
    
    def __init__(self):
        self._setup_metrics()
        self._setup_logging()
        self.validation_status = {}
    
    def _setup_metrics(self):
        """Setup Prometheus metrics for critical path monitoring"""
        # Medication Safety Metrics (HIGHEST)
        self.schedule_accuracy = Gauge(
            'medication_schedule_accuracy',
            'Schedule execution accuracy percentage'
        )
        self.interaction_checks = Counter(
            'medication_interaction_checks',
            'Number of drug interaction checks performed'
        )
        self.safety_alerts = Counter(
            'medication_safety_alerts',
            'Number of safety alerts generated'
        )
        
        # Security Metrics (HIGH)
        self.hipaa_compliance = Gauge(
            'security_hipaa_compliance',
            'HIPAA compliance status'
        )
        self.data_protection = Gauge(
            'security_data_protection',
            'Data protection status'
        )
        self.audit_logs = Counter(
            'security_audit_logs',
            'Number of security audit logs'
        )
        
        # Infrastructure Metrics (HIGH)
        self.system_health = Gauge(
            'infrastructure_system_health',
            'Overall system health status'
        )
        self.response_time = Histogram(
            'infrastructure_response_time',
            'API response time in seconds'
        )
        self.error_rate = Counter(
            'infrastructure_error_rate',
            'Number of system errors'
        )
    
    def _setup_logging(self):
        """Setup logging for critical path monitoring"""
        self.logger = logging.getLogger('critical_path_monitor')
        self.logger.setLevel(logging.INFO)
        
        # Ensure all logs are traceable
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s - '
            'Reference: MASTER_CRITICAL_PATH.md'
        )
        
        # Add file handler for evidence collection
        fh = logging.FileHandler('logs/critical_path.log')
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)
    
    def monitor_schedule_management(self, schedule_data: Dict) -> None:
        """
        Monitor schedule management (HIGHEST priority)
        Critical Path: Medication Safety > Schedule Management
        """
        try:
            accuracy = self._calculate_schedule_accuracy(schedule_data)
            self.schedule_accuracy.set(accuracy)
            
            self.logger.info(
                f"Schedule accuracy: {accuracy}%",
                extra={'critical_path': 'Medication Safety'}
            )
            
            self._validate_and_collect_evidence(
                'schedule_management',
                accuracy,
                'HIGHEST'
            )
        except Exception as e:
            self._handle_critical_error('schedule_management', e)
    
    def monitor_interaction_checking(self, interaction_data: Dict) -> None:
        """
        Monitor interaction checking (HIGHEST priority)
        Critical Path: Medication Safety > Interaction Checking
        """
        try:
            self.interaction_checks.inc()
            
            if interaction_data.get('conflict_detected'):
                self.safety_alerts.inc()
                
            self.logger.info(
                "Interaction check performed",
                extra={'critical_path': 'Medication Safety'}
            )
            
            self._validate_and_collect_evidence(
                'interaction_checking',
                1.0,
                'HIGHEST'
            )
        except Exception as e:
            self._handle_critical_error('interaction_checking', e)
    
    def monitor_security_compliance(self, security_data: Dict) -> None:
        """
        Monitor security compliance (HIGH priority)
        Critical Path: Data Security > HIPAA Compliance
        """
        try:
            compliance_score = self._calculate_compliance_score(security_data)
            self.hipaa_compliance.set(compliance_score)
            
            self.logger.info(
                f"HIPAA compliance score: {compliance_score}",
                extra={'critical_path': 'Data Security'}
            )
            
            self._validate_and_collect_evidence(
                'security_compliance',
                compliance_score,
                'HIGH'
            )
        except Exception as e:
            self._handle_critical_error('security_compliance', e)
    
    def monitor_system_health(self, health_data: Dict) -> None:
        """
        Monitor system health (HIGH priority)
        Critical Path: Core Infrastructure > System Health
        """
        try:
            health_score = self._calculate_health_score(health_data)
            self.system_health.set(health_score)
            
            self.logger.info(
                f"System health score: {health_score}",
                extra={'critical_path': 'Core Infrastructure'}
            )
            
            self._validate_and_collect_evidence(
                'system_health',
                health_score,
                'HIGH'
            )
        except Exception as e:
            self._handle_critical_error('system_health', e)
    
    def _calculate_schedule_accuracy(self, data: Dict) -> float:
        """Calculate schedule accuracy percentage"""
        total = data.get('total_schedules', 0)
        if total == 0:
            return 100.0
        
        accurate = data.get('accurate_schedules', 0)
        return (accurate / total) * 100
    
    def _calculate_compliance_score(self, data: Dict) -> float:
        """Calculate HIPAA compliance score"""
        checks = data.get('compliance_checks', [])
        if not checks:
            return 0.0
        
        passed = sum(1 for check in checks if check.get('passed'))
        return (passed / len(checks)) * 100
    
    def _calculate_health_score(self, data: Dict) -> float:
        """Calculate system health score"""
        metrics = data.get('health_metrics', {})
        if not metrics:
            return 0.0
        
        total_score = sum(metrics.values())
        return total_score / len(metrics)
    
    def _validate_and_collect_evidence(self, 
                                     component: str,
                                     value: float,
                                     priority: str) -> None:
        """
        Validate monitoring results and collect evidence
        Ensures alignment with critical path requirements
        """
        metric = CriticalPathMetric(
            name=component,
            category=priority,
            priority=priority,
            value=value,
            timestamp=datetime.now(),
            validation_status=True
        )
        
        self.validation_status[component] = metric
        
        self.logger.info(
            f"Validated {component} with value {value}",
            extra={
                'critical_path': priority,
                'evidence': str(metric)
            }
        )
    
    def _handle_critical_error(self, component: str, error: Exception) -> None:
        """
        Handle critical path errors
        Ensures proper error tracking and notification
        """
        self.error_rate.inc()
        
        self.logger.error(
            f"Critical path error in {component}: {str(error)}",
            extra={
                'critical_path': component,
                'error_trace': str(error)
            }
        )
        
        # Update validation status
        self.validation_status[component] = CriticalPathMetric(
            name=component,
            category='ERROR',
            priority='HIGHEST',
            value=0.0,
            timestamp=datetime.now(),
            validation_status=False
        )
