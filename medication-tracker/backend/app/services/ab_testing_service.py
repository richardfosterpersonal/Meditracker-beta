"""
A/B Testing Service
Implements A/B testing for beta features
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json
import os
from enum import Enum
import hashlib

from app.core.config import settings
from app.validation.validation_orchestrator import ValidationOrchestrator
from app.core.validation_monitoring import ValidationMonitor
from app.services.beta_user_service import BetaFeature

class TestGroup(str, Enum):
    """A/B test groups as defined in ab_testing_validation.md"""
    CONTROL = "control"
    TEST_A = "test_a"
    TEST_B = "test_b"

class ExperimentType(str, Enum):
    """Experiment types aligned with critical path"""
    MEDICATION_SAFETY = "medication_safety"
    DATA_SECURITY = "data_security"
    INFRASTRUCTURE = "infrastructure"

class ABTestingService:
    """
    A/B Testing Service
    Manages feature experiments and collects evidence
    """
    
    def __init__(self):
        self.validator = ValidationOrchestrator()
        self.monitor = ValidationMonitor()
        self.evidence_path = os.path.join(settings.VALIDATION_EVIDENCE_PATH, "ab_testing")
        
    async def get_user_group(
        self,
        user_id: str,
        experiment: str
    ) -> Tuple[TestGroup, Dict]:
        """Determines user's test group and validates access"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'experiment': experiment,
            'status': 'pending'
        }
        
        try:
            # 1. Validate experiment
            await self._validate_experiment(experiment, evidence)
            
            # 2. Determine group (deterministic based on user_id)
            group = self._determine_group(user_id, experiment)
            evidence['group'] = group
            
            # 3. Validate access
            await self._validate_group_access(user_id, group, experiment, evidence)
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'group_assignment')
            
            return group, {
                'status': 'success',
                'evidence': evidence
            }
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence, 'group_assignment')
            
            return TestGroup.CONTROL, {
                'status': 'error',
                'evidence': evidence,
                'error': str(e)
            }
            
    async def track_experiment_event(
        self,
        user_id: str,
        experiment: str,
        event_type: str,
        metrics: Dict
    ) -> Dict:
        """Tracks experiment events and collects metrics"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'experiment': experiment,
            'event_type': event_type,
            'metrics': metrics,
            'status': 'pending'
        }
        
        try:
            # 1. Validate metrics
            await self._validate_metrics(metrics, experiment, evidence)
            
            # 2. Track event
            group, _ = await self.get_user_group(user_id, experiment)
            evidence['group'] = group
            
            # 3. Store metrics
            await self._store_metrics(metrics, group, experiment, evidence)
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'metrics')
            
            return {
                'status': 'success',
                'evidence': evidence
            }
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence, 'metrics')
            
            return {
                'status': 'error',
                'evidence': evidence,
                'error': str(e)
            }
            
    def _determine_group(self, user_id: str, experiment: str) -> TestGroup:
        """Deterministically assigns user to a test group"""
        # Create a hash of user_id and experiment
        hash_input = f"{user_id}:{experiment}".encode('utf-8')
        hash_value = hashlib.md5(hash_input).hexdigest()
        
        # Use last byte for distribution
        last_byte = int(hash_value[-2:], 16)
        
        # Distribute users across groups
        if last_byte < 85:  # ~33%
            return TestGroup.CONTROL
        elif last_byte < 170:  # ~33%
            return TestGroup.TEST_A
        else:  # ~33%
            return TestGroup.TEST_B
            
    async def _validate_experiment(
        self,
        experiment: str,
        evidence: Dict
    ) -> None:
        """Validates experiment requirements"""
        validation = {
            'type': 'experiment_validation',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        # Validate against critical path
        result = await self.validator.validate_critical_path(
            component='ab_testing',
            action=f'validate_{experiment}'
        )
        
        if result['status'] != 'success':
            validation['status'] = 'failed'
            raise ValueError(f"Experiment validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    async def _validate_group_access(
        self,
        user_id: str,
        group: TestGroup,
        experiment: str,
        evidence: Dict
    ) -> None:
        """Validates group access requirements"""
        validation = {
            'type': 'group_access',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Validate beta access
        result = await self.validator.validate_beta_phase(
            feature=experiment,
            user_id=user_id
        )
        
        if result['status'] != 'success':
            validation['status'] = 'failed'
            raise ValueError(f"Group access validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    async def _validate_metrics(
        self,
        metrics: Dict,
        experiment: str,
        evidence: Dict
    ) -> None:
        """Validates metrics requirements"""
        validation = {
            'type': 'metrics_validation',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add metrics validation logic here
        required_metrics = settings.AB_TESTING.get(experiment, {}).get('required_metrics', [])
        missing_metrics = [m for m in required_metrics if m not in metrics]
        
        if missing_metrics:
            validation['status'] = 'failed'
            raise ValueError(f"Missing required metrics: {missing_metrics}")
            
        validation['status'] = 'complete'
        
    async def _store_metrics(
        self,
        metrics: Dict,
        group: TestGroup,
        experiment: str,
        evidence: Dict
    ) -> None:
        """Stores experiment metrics"""
        metrics_path = os.path.join(
            self.evidence_path,
            'metrics',
            experiment,
            str(group)
        )
        
        if not os.path.exists(metrics_path):
            os.makedirs(metrics_path)
            
        filename = f"{evidence['timestamp']}_{evidence['user_id']}.json"
        filepath = os.path.join(metrics_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(metrics, f, indent=2)
            
    async def _save_evidence(
        self,
        evidence: Dict,
        category: str
    ) -> None:
        """Saves validation evidence"""
        evidence_path = os.path.join(self.evidence_path, 'evidence', category)
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['experiment']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring system
        self.monitor.track_validation(f"ab_testing_{evidence['experiment']}")
