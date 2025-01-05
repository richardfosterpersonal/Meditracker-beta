"""
Security Validation Middleware
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from functools import wraps
from datetime import datetime
import json
import os
from typing import Callable, Dict, Any

from flask import request, g
from app.core.config import settings

def validate_security(f: Callable) -> Callable:
    """Security validation middleware that enforces validation requirements"""
    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        if not settings.VALIDATION_ENABLED:
            return f(*args, **kwargs)

        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'endpoint': request.endpoint,
            'method': request.method,
            'validation_status': 'pending'
        }

        try:
            # 1. Validate HIPAA compliance
            validate_hipaa_compliance()

            # 2. Validate data protection
            validate_data_protection()

            # 3. Validate authentication
            validate_authentication()

            evidence['validation_status'] = 'complete'
            save_validation_evidence(evidence)
            
            return f(*args, **kwargs)
        except Exception as e:
            evidence['validation_status'] = 'failed'
            evidence['error'] = str(e)
            save_validation_evidence(evidence)
            raise

    return decorated

def validate_hipaa_compliance() -> None:
    """Validates HIPAA compliance requirements"""
    if not settings.HIPAA_COMPLIANCE_ENABLED:
        raise ValueError("HIPAA compliance validation failed")
    
    # Add specific HIPAA validation logic here
    pass

def validate_data_protection() -> None:
    """Validates data protection requirements"""
    required_headers = ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection']
    
    for header in required_headers:
        if header not in request.headers:
            raise ValueError(f"Missing required security header: {header}")

def validate_authentication() -> None:
    """Validates authentication requirements"""
    if 'Authorization' not in request.headers:
        raise ValueError("Missing authentication token")

def save_validation_evidence(evidence: Dict) -> None:
    """Saves validation evidence"""
    if not os.path.exists(settings.VALIDATION_EVIDENCE_PATH):
        os.makedirs(settings.VALIDATION_EVIDENCE_PATH)
        
    filename = f"{evidence['timestamp']}_security_validation.json"
    filepath = os.path.join(settings.VALIDATION_EVIDENCE_PATH, filename)
    
    with open(filepath, 'w') as f:
        json.dump(evidence, f, indent=2)
