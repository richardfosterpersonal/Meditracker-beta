"""
Beta Feature Orchestrator
Manages beta features while maintaining critical path alignment
"""
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
import json
import os
from enum import Enum
import asyncio
from collections import defaultdict

from app.core.config import settings
from app.core.validation_monitoring import ValidationMonitor
from app.services.metrics_service import MetricsService
from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult

class BetaFeature(str, Enum):
    """Beta features from SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION_SAFETY = "medication_safety"
    VALIDATION_SYSTEM = "validation_system"
    SECURITY_SYSTEM = "security_system"
    MONITORING_SYSTEM = "monitoring_system"
    EVIDENCE_SYSTEM = "evidence_system"

class BetaPhase(str, Enum):
    """Beta phases from SINGLE_SOURCE_VALIDATION.md"""
    ALPHA = "alpha"
    BETA_INTERNAL = "beta_internal"
    BETA_EXTERNAL = "beta_external"
    BETA_PRODUCTION = "beta_production"

class BetaFeatureOrchestrator:
    """
    Beta Feature Orchestrator
    Manages beta features and maintains critical path alignment
    """
    
    def __init__(self):
        self.critical_path = UnifiedCriticalPath()
        self.monitor = ValidationMonitor()
        self.metrics = MetricsService()
        self._feature_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def validate_beta_feature(
        self,
        feature: BetaFeature,
        phase: BetaPhase,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """Validates beta feature against critical path"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'feature': feature,
            'phase': phase,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_critical_path(feature, phase, data, evidence)
            
            # 2. Beta phase validation
            await self._validate_beta_phase(feature, phase, data, evidence)
            
            # 3. Feature validation
            await self._validate_feature(feature, phase, data, evidence)
            
            # 4. Evidence collection
            await self._collect_beta_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_beta_evidence(evidence)
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='beta_feature',
                name=f'{feature}_{phase}_validation',
                value={
                    'status': 'success',
                    'phase': phase
                },
                priority='critical'
            )
            
            return ValidationResult(
                is_valid=True,
                evidence=evidence
            )
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_beta_evidence(evidence)
            
            # Track error
            await self.metrics.track_metric(
                metric_type='beta_feature',
                name=f'{feature}_{phase}_error',
                value={
                    'error': str(e),
                    'phase': phase
                },
                priority='critical'
            )
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _validate_critical_path(
        self,
        feature: BetaFeature,
        phase: BetaPhase,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates against critical path"""
        validation = {
            'type': 'critical_path',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        # Check critical path requirements
        if not AppState.BETA_FEATURES.get(str(feature), {}).get('enabled', False):
            validation['status'] = 'failed'
            raise ValueError(f"Feature {feature} not enabled in critical path")
            
        # Check validation requirements
        if not AppState.VALIDATION_REQUIREMENTS.get(str(feature), {}).get('validation_required', False):
            validation['status'] = 'failed'
            raise ValueError(f"Validation not required for {feature}")
            
        validation['status'] = 'complete'
        
    async def _validate_beta_phase(
        self,
        feature: BetaFeature,
        phase: BetaPhase,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates beta phase requirements"""
        validation = {
            'type': 'beta_phase',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Check phase requirements
        if phase == BetaPhase.BETA_PRODUCTION:
            if not await self._validate_production_ready(feature, data):
                validation['status'] = 'failed'
                raise ValueError(f"Feature {feature} not production ready")
                
        # Check monitoring requirements
        if not AppState.MONITORING_REQUIREMENTS.get(str(feature), {}).get('monitoring_required', False):
            validation['status'] = 'failed'
            raise ValueError(f"Monitoring not enabled for {feature}")
            
        validation['status'] = 'complete'
        
    async def _validate_feature(
        self,
        feature: BetaFeature,
        phase: BetaPhase,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates feature requirements"""
        validation = {
            'type': 'feature',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Validate based on feature
        if feature == BetaFeature.MEDICATION_SAFETY:
            await self._validate_medication_safety(phase, data, validation)
        elif feature == BetaFeature.VALIDATION_SYSTEM:
            await self._validate_validation_system(phase, data, validation)
        elif feature == BetaFeature.SECURITY_SYSTEM:
            await self._validate_security_system(phase, data, validation)
        elif feature == BetaFeature.MONITORING_SYSTEM:
            await self._validate_monitoring_system(phase, data, validation)
        elif feature == BetaFeature.EVIDENCE_SYSTEM:
            await self._validate_evidence_system(phase, data, validation)
            
        validation['status'] = 'complete'
        
    async def _collect_beta_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Collects beta evidence"""
        async with self._buffer_lock:
            feature = evidence['feature']
            phase = evidence['phase']
            
            if feature not in self._feature_buffer:
                self._feature_buffer[feature] = {}
                
            if phase not in self._feature_buffer[feature]:
                self._feature_buffer[feature][phase] = []
                
            self._feature_buffer[feature][phase].append(evidence)
            
            # Process if buffer gets too large
            if len(self._feature_buffer[feature][phase]) >= settings.BETA_BUFFER_SIZE:
                await self._process_beta_buffer(feature, phase)
                
    async def _process_beta_buffer(
        self,
        feature: Optional[BetaFeature] = None,
        phase: Optional[BetaPhase] = None
    ) -> None:
        """Processes beta buffer"""
        async with self._buffer_lock:
            features = [feature] if feature else list(self._feature_buffer.keys())
            
            for f in features:
                phases = [phase] if phase else list(self._feature_buffer[f].keys())
                
                for p in phases:
                    if not self._feature_buffer[f][p]:
                        continue
                        
                    evidence_path = os.path.join(
                        settings.BETA_EVIDENCE_PATH,
                        str(f),
                        str(p),
                        datetime.utcnow().strftime('%Y-%m-%d')
                    )
                    
                    if not os.path.exists(evidence_path):
                        os.makedirs(evidence_path)
                        
                    filename = f"{datetime.utcnow().isoformat()}.json"
                    filepath = os.path.join(evidence_path, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(self._feature_buffer[f][p], f, indent=2)
                        
                    self._feature_buffer[f][p] = []
                    
    async def _save_beta_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Saves beta evidence"""
        evidence_path = os.path.join(
            settings.BETA_EVIDENCE_PATH,
            str(evidence['feature']),
            str(evidence['phase'])
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring
        self.monitor.track_validation(f"beta_feature_{evidence['feature']}_{evidence['phase']}")
        
    async def _validate_production_ready(
        self,
        feature: BetaFeature,
        data: Dict[str, Any]
    ) -> bool:
        """Validates if feature is production ready"""
        # Add production validation logic
        return True
        
    async def _validate_medication_safety(
        self,
        phase: BetaPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates medication safety feature"""
        # Add medication safety validation logic
        pass
        
    async def _validate_validation_system(
        self,
        phase: BetaPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates validation system feature"""
        # Add validation system validation logic
        pass
        
    async def _validate_security_system(
        self,
        phase: BetaPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates security system feature"""
        # Add security system validation logic
        pass
        
    async def _validate_monitoring_system(
        self,
        phase: BetaPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates monitoring system feature"""
        # Add monitoring system validation logic
        pass
        
    async def _validate_evidence_system(
        self,
        phase: BetaPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates evidence system feature"""
        # Add evidence system validation logic
        pass
