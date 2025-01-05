"""
Unified Critical Path Orchestrator
Manages the entire application's critical path and single source of truth
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
from app.services.critical_path_service import CriticalPathService
from app.validation.enhanced_validation_orchestrator import EnhancedValidationOrchestrator
from app.validation.validation_types import ValidationResult

class AppPhase(str, Enum):
    """Application phases from SINGLE_SOURCE_VALIDATION.md"""
    BETA = "beta"
    PRODUCTION = "production"
    DEVELOPMENT = "development"

class AppComponent(str, Enum):
    """Application components from SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION = "medication"
    VALIDATION = "validation"
    SECURITY = "security"
    INFRASTRUCTURE = "infrastructure"
    MONITORING = "monitoring"
    EVIDENCE = "evidence"

class UnifiedCriticalPath:
    """
    Unified Critical Path Orchestrator
    Manages entire application critical path and single source of truth
    """
    
    def __init__(self):
        self.critical_path = CriticalPathService()
        self.validator = EnhancedValidationOrchestrator()
        self.monitor = ValidationMonitor()
        self.metrics = MetricsService()
        self._state_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def validate_app_state(
        self,
        phase: AppPhase,
        component: AppComponent,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """Validates entire application state"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'phase': phase,
            'component': component,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_critical_path(phase, component, data, evidence)
            
            # 2. Single source validation
            await self._validate_single_source(phase, component, data, evidence)
            
            # 3. Beta phase validation (if applicable)
            if phase == AppPhase.BETA:
                await self._validate_beta_phase(component, data, evidence)
            
            # 4. Evidence collection
            await self._collect_app_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_app_evidence(evidence)
            
            # Track in metrics
            await self.metrics.track_metric(
                metric_type='app_state',
                name=f'{phase}_{component}_validation',
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
            await self._save_app_evidence(evidence)
            
            # Track error
            await self.metrics.track_metric(
                metric_type='app_state',
                name=f'{phase}_{component}_error',
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
        phase: AppPhase,
        component: AppComponent,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates critical path requirements"""
        validation = {
            'type': 'critical_path',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        # Validate based on component
        if component == AppComponent.MEDICATION:
            await self._validate_medication(phase, data, validation)
        elif component == AppComponent.VALIDATION:
            await self._validate_validation_system(phase, data, validation)
        elif component == AppComponent.SECURITY:
            await self._validate_security(phase, data, validation)
        elif component == AppComponent.INFRASTRUCTURE:
            await self._validate_infrastructure(phase, data, validation)
        elif component == AppComponent.MONITORING:
            await self._validate_monitoring(phase, data, validation)
        elif component == AppComponent.EVIDENCE:
            await self._validate_evidence_system(phase, data, validation)
            
        validation['status'] = 'complete'
        
    async def _validate_single_source(
        self,
        phase: AppPhase,
        component: AppComponent,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates single source of truth"""
        validation = {
            'type': 'single_source',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Check documentation
        if not await self._check_documentation(phase, component):
            validation['status'] = 'failed'
            raise ValueError(f"Documentation check failed for {phase}_{component}")
            
        # Check evidence
        if not await self._check_evidence_state(phase, component):
            validation['status'] = 'failed'
            raise ValueError(f"Evidence check failed for {phase}_{component}")
            
        validation['status'] = 'complete'
        
    async def _validate_beta_phase(
        self,
        component: AppComponent,
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
        
        # Check beta requirements
        if not await self._check_beta_requirements(component):
            validation['status'] = 'failed'
            raise ValueError(f"Beta requirements check failed for {component}")
            
        # Check feature flags
        if not await self._check_feature_flags(component):
            validation['status'] = 'failed'
            raise ValueError(f"Feature flags check failed for {component}")
            
        validation['status'] = 'complete'
        
    async def _collect_app_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Collects application evidence"""
        async with self._buffer_lock:
            phase = evidence['phase']
            component = evidence['component']
            
            if phase not in self._state_buffer:
                self._state_buffer[phase] = {}
            
            if component not in self._state_buffer[phase]:
                self._state_buffer[phase][component] = []
                
            self._state_buffer[phase][component].append(evidence)
            
            # Process if buffer gets too large
            if len(self._state_buffer[phase][component]) >= settings.APP_STATE_BUFFER_SIZE:
                await self._process_app_buffer(phase, component)
                
    async def _process_app_buffer(
        self,
        phase: Optional[AppPhase] = None,
        component: Optional[AppComponent] = None
    ) -> None:
        """Processes application buffer"""
        async with self._buffer_lock:
            phases = [phase] if phase else list(self._state_buffer.keys())
            
            for p in phases:
                components = [component] if component else list(self._state_buffer[p].keys())
                
                for c in components:
                    if not self._state_buffer[p][c]:
                        continue
                        
                    evidence_path = os.path.join(
                        settings.APP_EVIDENCE_PATH,
                        str(p),
                        str(c),
                        datetime.utcnow().strftime('%Y-%m-%d')
                    )
                    
                    if not os.path.exists(evidence_path):
                        os.makedirs(evidence_path)
                        
                    filename = f"{datetime.utcnow().isoformat()}.json"
                    filepath = os.path.join(evidence_path, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(self._state_buffer[p][c], f, indent=2)
                        
                    self._state_buffer[p][c] = []
                    
    async def _save_app_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Saves application evidence"""
        evidence_path = os.path.join(
            settings.APP_EVIDENCE_PATH,
            str(evidence['phase']),
            str(evidence['component'])
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring
        self.monitor.track_validation(f"app_state_{evidence['phase']}_{evidence['component']}")
        
    async def _validate_medication(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates medication component"""
        # Add medication validation logic
        pass
        
    async def _validate_validation_system(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates validation system"""
        # Add validation system logic
        pass
        
    async def _validate_security(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates security component"""
        # Add security validation logic
        pass
        
    async def _validate_infrastructure(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates infrastructure component"""
        # Add infrastructure validation logic
        pass
        
    async def _validate_monitoring(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates monitoring component"""
        # Add monitoring validation logic
        pass
        
    async def _validate_evidence_system(
        self,
        phase: AppPhase,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates evidence system"""
        # Add evidence system validation logic
        pass
        
    async def _check_documentation(
        self,
        phase: AppPhase,
        component: AppComponent
    ) -> bool:
        """Checks documentation requirements"""
        # Add documentation check logic
        return True
        
    async def _check_evidence_state(
        self,
        phase: AppPhase,
        component: AppComponent
    ) -> bool:
        """Checks evidence state"""
        # Add evidence state check logic
        return True
        
    async def _check_beta_requirements(
        self,
        component: AppComponent
    ) -> bool:
        """Checks beta phase requirements"""
        # Add beta requirements check logic
        return True
        
    async def _check_feature_flags(
        self,
        component: AppComponent
    ) -> bool:
        """Checks feature flags"""
        # Add feature flags check logic
        return True
