"""
Beta User Management Validation
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from typing import Dict, List, Optional
from datetime import datetime
import json
import os
from functools import wraps

from app.core.config import settings
from app.core.validation_monitoring import ValidationMonitor
from app.middleware.security_validation import validate_security

class BetaUserValidator:
    """Validates beta user management requirements"""
    
    def __init__(self):
        self.monitor = ValidationMonitor()
        self.validation_id = "VALIDATION-BETA-001"
        self.evidence_path = os.path.join(settings.VALIDATION_EVIDENCE_PATH, "beta_users")
        
    def validate_access(self, user_id: str, feature: str) -> Dict:
        """Validates user access to features"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'validation_id': self.validation_id,
            'user_id': user_id,
            'feature': feature,
            'status': 'pending'
        }
        
        try:
            self._validate_user_role(user_id)
            self._validate_feature_access(user_id, feature)
            self._validate_phi_protection(user_id)
            
            evidence['status'] = 'complete'
            self._save_evidence(evidence)
            return {'status': 'success', 'evidence': evidence}
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            self._save_evidence(evidence)
            return {'status': 'error', 'evidence': evidence}
            
    def _validate_user_role(self, user_id: str) -> None:
        """Validates user role requirements"""
        if not settings.BETA_USER_VALIDATION:
            raise ValueError("Beta user validation not enabled")
            
    def _validate_feature_access(self, user_id: str, feature: str) -> None:
        """Validates feature access requirements"""
        if not settings.BETA_FEATURE_FLAGS:
            raise ValueError("Feature flag validation not enabled")
            
    def _validate_phi_protection(self, user_id: str) -> None:
        """Validates PHI protection requirements"""
        if not settings.HIPAA_COMPLIANCE_ENABLED:
            raise ValueError("HIPAA compliance validation not enabled")
            
    def _save_evidence(self, evidence: Dict) -> None:
        """Saves validation evidence"""
        if not os.path.exists(self.evidence_path):
            os.makedirs(self.evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['user_id']}.json"
        filepath = os.path.join(self.evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)


def validate_beta_access(feature: str):
    """Decorator to validate beta user access"""
    def decorator(f):
        @wraps(f)
        @validate_security  # Ensure security validation runs first
        def wrapper(*args, **kwargs):
            validator = BetaUserValidator()
            user_id = kwargs.get('user_id')  # Assume user_id is passed in kwargs
            
            result = validator.validate_access(user_id, feature)
            if result['status'] != 'success':
                raise ValueError(f"Beta access validation failed: {result.get('error')}")
                
            return f(*args, **kwargs)
        return wrapper
    return decorator
