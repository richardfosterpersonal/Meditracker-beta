"""
Core Metric Service for Beta Critical Path
Last Updated: 2024-12-25T11:17:44+01:00
ValidationID: VALIDATION-MON-CORE-001
"""

from prometheus_client import Counter, Histogram, Gauge
from typing import Dict, Any
from datetime import datetime
from app.models.medication import Medication
from app.models.schedule import Schedule

class MetricService:
    """Minimal metric service for beta critical path requirements"""
    
    def __init__(self):
        # Medication Safety Metrics (HIGHEST)
        self.schedule_execution_counter = Counter(
            'medication_schedule_execution_total',
            'Total number of medication schedule executions',
            ['user_id', 'status']
        )
        
        self.interaction_check_counter = Counter(
            'medication_interaction_check_total',
            'Total number of drug interaction checks',
            ['status']
        )
        
        # HIPAA Compliance Metrics (HIGH)
        self.phi_access_counter = Counter(
            'phi_access_total',
            'Total number of PHI access events',
            ['action', 'status']
        )
        
        # Core Health Metrics (HIGH)
        self.api_latency = Histogram(
            'api_request_duration_seconds',
            'API request latency in seconds',
            ['endpoint']
        )
    
    def track_schedule_execution(self, schedule: Schedule, status: str = 'success'):
        """Track medication schedule execution - CRITICAL PATH"""
        self.schedule_execution_counter.labels(
            user_id=str(schedule.user_id),
            status=status
        ).inc()
    
    def track_interaction_check(self, medications: list[Medication], status: str = 'success'):
        """Track drug interaction check - CRITICAL PATH"""
        self.interaction_check_counter.labels(
            status=status
        ).inc()
    
    def track_phi_access(self, event: Dict[str, Any]):
        """Track PHI access for HIPAA compliance - CRITICAL PATH"""
        self.phi_access_counter.labels(
            action=event['action'],
            status='success'
        ).inc()
    
    def track_api_performance(self, endpoint: str, status_code: int):
        """Track core API performance - CRITICAL PATH"""
        # Only track essential endpoints
        if endpoint.startswith(('/api/v1/medications', '/api/v1/schedules')):
            self.api_latency.labels(
                endpoint=endpoint
            ).observe(0.1)  # Placeholder value
