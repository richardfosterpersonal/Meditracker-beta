"""
Beta User Service
Implements beta user management and feature flags
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from typing import Dict, List, Optional
from datetime import datetime
import json
import os
from enum import Enum

from app.core.config import settings
from app.validation.validation_orchestrator import ValidationOrchestrator
from app.core.validation_monitoring import ValidationMonitor

class BetaFeature(str, Enum):
    """Beta features as defined in BETA_FEATURES.md"""
    MEDICATION_MANAGEMENT = "medication_management"
    DRUG_INTERACTION = "drug_interaction"
    EMERGENCY_PROTOCOLS = "emergency_protocols"

class BetaUserLevel(str, Enum):
    """Beta user levels as defined in BETA_FEATURES.md"""
    BASIC = "basic"      # Level 1
    ADVANCED = "advanced"  # Level 2
    FULL = "full"        # Level 3

class BetaUserService:
    """
    Beta User Service
    Manages beta features and user access
    """
    
    def __init__(self):
        self.validator = ValidationOrchestrator()
        self.monitor = ValidationMonitor()
        self.evidence_path = os.path.join(settings.VALIDATION_EVIDENCE_PATH, "beta_users")
        
    async def validate_feature_access(
        self,
        user_id: str,
        feature: BetaFeature,
        action: str
    ) -> Dict:
        """Validates user access to beta features"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'feature': feature,
            'action': action,
            'status': 'pending'
        }
        
        try:
            # 1. Validate critical path
            await self._validate_critical_path(user_id, feature, evidence)
            
            # 2. Check beta access
            await self._validate_beta_access(user_id, feature, evidence)
            
            # 3. Verify feature status
            await self._validate_feature_status(feature, evidence)
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence)
            
            return {
                'status': 'success',
                'evidence': evidence,
                'access_granted': True
            }
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence)
            
            return {
                'status': 'error',
                'evidence': evidence,
                'access_granted': False,
                'error': str(e)
            }
            
    async def _validate_critical_path(
        self,
        user_id: str,
        feature: BetaFeature,
        evidence: Dict
    ) -> None:
        """Validates against critical path requirements"""
        validation = {
            'type': 'critical_path',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        result = await self.validator.validate_critical_path(
            component='beta_user',
            action=f'validate_{feature}'
        )
        
        if result['status'] != 'success':
            validation['status'] = 'failed'
            raise ValueError(f"Critical path validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    async def _validate_beta_access(
        self,
        user_id: str,
        feature: BetaFeature,
        evidence: Dict
    ) -> None:
        """Validates beta access requirements"""
        validation = {
            'type': 'beta_access',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        result = await self.validator.validate_beta_phase(
            feature=str(feature),
            user_id=user_id
        )
        
        if result['status'] != 'success':
            validation['status'] = 'failed'
            raise ValueError(f"Beta access validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    async def _validate_feature_status(
        self,
        feature: BetaFeature,
        evidence: Dict
    ) -> None:
        """Validates feature status requirements"""
        validation = {
            'type': 'feature_status',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add feature-specific validation logic here
        if not settings.BETA_FEATURES.get(str(feature), {}).get('enabled', False):
            validation['status'] = 'failed'
            raise ValueError(f"Feature {feature} is not enabled")
            
        validation['status'] = 'complete'
        
    async def _save_evidence(self, evidence: Dict) -> None:
        """Saves validation evidence"""
        if not os.path.exists(self.evidence_path):
            os.makedirs(self.evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['user_id']}_{evidence['feature']}.json"
        filepath = os.path.join(self.evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring system
        self.monitor.track_validation(f"beta_user_{evidence['feature']}")
