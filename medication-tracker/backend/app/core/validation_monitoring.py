"""
Validation-aware monitoring wrapper
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from typing import Any, Dict, Optional
from datetime import datetime
import json
import os
from functools import wraps
from pathlib import Path

from .config import get_settings

settings = get_settings()

from app.core.monitoring import (
    PerformanceMonitor,
    HIPAACompliantLogger,
    MetricsCollector,
    monitor_performance
)

class ValidationMonitor:
    """Validation-aware monitoring that ensures compliance with validation requirements"""
    
    def __init__(self):
        self.logger = HIPAACompliantLogger()
        self.metrics = MetricsCollector()
        self.evidence_path = Path(settings.VALIDATION_EVIDENCE_PATH)
        
    def track_validation(self, validation_id: str) -> None:
        """Track validation occurrence with evidence"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'validation_id': validation_id,
            'status': 'pending'
        }
        
        try:
            # Track validation metrics
            with PerformanceMonitor.track_operation('validation_check'):
                self._validate_requirements(validation_id)
                
            evidence['status'] = 'complete'
            self._save_evidence(evidence)
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            self._save_evidence(evidence)
            raise
            
    def _validate_requirements(self, validation_id: str) -> None:
        """Validate monitoring requirements"""
        # Check monitoring is enabled
        if not settings.MONITORING_ENABLED:
            raise ValueError("Monitoring validation failed: Monitoring disabled")
            
        # Verify HIPAA compliance
        if not settings.HIPAA_COMPLIANCE_ENABLED:
            raise ValueError("Monitoring validation failed: HIPAA compliance disabled")
            
        # Check evidence collection
        if not self.evidence_path.exists():
            raise ValueError("Monitoring validation failed: Evidence path not found")
            
    def _save_evidence(self, evidence: Dict) -> None:
        """Save validation evidence"""
        if not self.evidence_path.exists():
            self.evidence_path.mkdir(parents=True, exist_ok=True)
            
        filename = f"{evidence['timestamp']}_{evidence['validation_id']}.json"
        filepath = self.evidence_path / filename
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)

def validate_monitoring(validation_id: str):
    """Decorator to ensure monitoring validation"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            monitor = ValidationMonitor()
            monitor.track_validation(validation_id)
            return f(*args, **kwargs)
        return wrapper
    return decorator
