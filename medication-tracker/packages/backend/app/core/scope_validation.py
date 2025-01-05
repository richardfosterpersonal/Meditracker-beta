"""
Scope Validation System
Last Updated: 2024-12-25T23:13:38+01:00
Critical Path: Tools.Validation

Validates code changes against defined scope and critical path requirements.
"""

import os
from pathlib import Path
from typing import Dict, List, Set, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class ValidationContext:
    file_path: str
    is_critical_path: bool
    is_beta_critical: bool
    component_type: str
    validation_status: str
    validation_file: Optional[str] = None

class BetaCriticalValidator:
    """Validates beta-critical components"""
    
    BETA_CRITICAL_COMPONENTS = {
        'medication_safety': {
            'paths': ['backend/app/validation/medication_safety.py'],
            'required_validations': [
                'drug_interaction',
                'dosage_verification',
                'emergency_protocol',
                'allergy_checks'
            ]
        },
        'security': {
            'paths': [
                'backend/app/security',
                'backend/app/core/encryption.py',
                'backend/app/core/audit.py'
            ],
            'required_validations': [
                'hipaa_compliance',
                'data_encryption',
                'access_control',
                'audit_logging'
            ]
        },
        'core_reliability': {
            'paths': [
                'backend/app/core/monitoring.py',
                'backend/app/core/state_management.py',
                'backend/app/core/error_handling.py'
            ],
            'required_validations': [
                'data_persistence',
                'error_handling',
                'state_management',
                'basic_monitoring'
            ]
        }
    }
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.validation_dir = self.project_root / 'docs' / 'validation'
        
    def is_beta_critical(self, file_path: str) -> bool:
        """Check if a file is beta-critical"""
        rel_path = str(Path(file_path).relative_to(self.project_root))
        
        for component in self.BETA_CRITICAL_COMPONENTS.values():
            for path in component['paths']:
                if rel_path.startswith(path):
                    return True
        return False
        
    def get_component_type(self, file_path: str) -> str:
        """Get the component type for a file"""
        rel_path = str(Path(file_path).relative_to(self.project_root))
        
        for comp_type, config in self.BETA_CRITICAL_COMPONENTS.items():
            for path in config['paths']:
                if rel_path.startswith(path):
                    return comp_type
        return 'non_critical'
        
    def get_required_validations(self, component_type: str) -> List[str]:
        """Get required validations for a component type"""
        return self.BETA_CRITICAL_COMPONENTS.get(
            component_type, {}
        ).get('required_validations', [])
        
    def check_validation_status(self, file_path: str) -> str:
        """Check validation status of a file"""
        component_type = self.get_component_type(file_path)
        if component_type == 'non_critical':
            return 'NOT_REQUIRED'
            
        validation_file = self.validation_dir / f"{component_type}_validation.md"
        if not validation_file.exists():
            return 'MISSING_VALIDATION'
            
        required = set(self.get_required_validations(component_type))
        if not required:
            return 'VALID'
            
        # Check validation file content
        with open(validation_file, 'r') as f:
            content = f.read().lower()
            validated = set()
            for req in required:
                if f"[x] {req.lower()}" in content:
                    validated.add(req)
                    
        if validated == required:
            return 'VALID'
        elif validated:
            return 'PARTIAL'
        return 'INVALID'

def get_validation_context(file_path: str) -> ValidationContext:
    """Get validation context for a file"""
    validator = BetaCriticalValidator(str(Path(file_path).parent.parent.parent))
    
    is_beta = validator.is_beta_critical(file_path)
    component = validator.get_component_type(file_path)
    status = validator.check_validation_status(file_path)
    
    validation_file = None
    if is_beta:
        val_path = Path(file_path).parent.parent.parent / 'docs' / 'validation'
        val_file = val_path / f"{component}_validation.md"
        if val_file.exists():
            validation_file = str(val_file)
    
    return ValidationContext(
        file_path=file_path,
        is_critical_path=True if component != 'non_critical' else False,
        is_beta_critical=is_beta,
        component_type=component,
        validation_status=status,
        validation_file=validation_file
    )

def is_critical_path_file(file_path: str) -> bool:
    """Check if a file is in the critical path"""
    context = get_validation_context(file_path)
    return context.is_critical_path
