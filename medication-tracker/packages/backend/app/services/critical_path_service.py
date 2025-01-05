"""
Critical Path Service
Enforces critical path requirements and single source of truth
"""
from typing import Dict, List, Optional, Union
from datetime import datetime
import json
import os
from enum import Enum
import asyncio
from collections import defaultdict

from app.core.config import settings
from app.core.validation_monitoring import ValidationMonitor
from app.services.metrics_service import MetricsService
from app.validation.enhanced_validation_orchestrator import EnhancedValidationOrchestrator
from app.validation.validation_types import ValidationResult

class CriticalPathComponent(str, Enum):
    """Critical path components from SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION_SAFETY = "medication_safety"
    DATA_SECURITY = "data_security"
    INFRASTRUCTURE = "infrastructure"

class ValidationLevel(str, Enum):
    """Validation levels from SINGLE_SOURCE_VALIDATION.md"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class CriticalPathService:
    """
    Critical Path Service
    Manages critical path validation and single source of truth
    """
    
    def __init__(self):
        self.validator = EnhancedValidationOrchestrator()
        self.monitor = ValidationMonitor()
        self.metrics = MetricsService()
        self._validation_buffer = defaultdict(list)
        self._buffer_lock = asyncio.Lock()
        
    async def validate_critical_path(
        self,
        component: CriticalPathComponent,
        data: Dict,
        level: ValidationLevel = ValidationLevel.HIGH
    ) -> ValidationResult:
        """Validates against critical path requirements"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': component,
            'level': level,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_component(component, data, evidence)
            
            # 2. Single source validation
            await self._validate_single_source(component, data, evidence)
            
            # 3. Evidence collection
            await self._collect_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'critical_path')
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='critical_path',
                name=f'{component}_validation',
                value={
                    'status': 'success',
                    'level': level
                },
                priority='high'
            )
            
            return ValidationResult(
                is_valid=True,
                evidence=evidence
            )
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence, 'critical_path')
            
            # Track error
            await self.metrics.track_metric(
                metric_type='critical_path',
                name=f'{component}_validation_error',
                value={
                    'error': str(e),
                    'level': level
                },
                priority='high'
            )
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _validate_component(
        self,
        component: CriticalPathComponent,
        data: Dict,
        evidence: Dict
    ) -> None:
        """Validates component against critical path"""
        validation = {
            'type': 'component',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        # Validate based on component
        if component == CriticalPathComponent.MEDICATION_SAFETY:
            await self._validate_medication_safety(data, validation)
        elif component == CriticalPathComponent.DATA_SECURITY:
            await self._validate_data_security(data, validation)
        elif component == CriticalPathComponent.INFRASTRUCTURE:
            await self._validate_infrastructure(data, validation)
            
        validation['status'] = 'complete'
        
    async def _validate_single_source(
        self,
        component: CriticalPathComponent,
        data: Dict,
        evidence: Dict
    ) -> None:
        """Validates against single source of truth"""
        validation = {
            'type': 'single_source',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Check single source requirements
        if not await self._check_documentation(component):
            validation['status'] = 'failed'
            raise ValueError(f"Documentation check failed for {component}")
            
        if not await self._check_evidence(component):
            validation['status'] = 'failed'
            raise ValueError(f"Evidence check failed for {component}")
            
        validation['status'] = 'complete'
        
    async def _validate_medication_safety(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates medication safety requirements"""
        # Check validation system
        if not await self._check_validation_system():
            validation['status'] = 'failed'
            raise ValueError("Validation system check failed")
            
        # Check evidence collection
        if not await self._check_evidence_collection():
            validation['status'] = 'failed'
            raise ValueError("Evidence collection check failed")
            
        # Check user protection
        if not await self._check_user_protection():
            validation['status'] = 'failed'
            raise ValueError("User protection check failed")
            
    async def _validate_data_security(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates data security requirements"""
        # Check HIPAA compliance
        if not await self._check_hipaa_compliance():
            validation['status'] = 'failed'
            raise ValueError("HIPAA compliance check failed")
            
        # Check security validation
        if not await self._check_security_validation():
            validation['status'] = 'failed'
            raise ValueError("Security validation check failed")
            
        # Check evidence collection
        if not await self._check_security_evidence():
            validation['status'] = 'failed'
            raise ValueError("Security evidence check failed")
            
    async def _validate_infrastructure(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates infrastructure requirements"""
        # Check core systems
        if not await self._check_core_systems():
            validation['status'] = 'failed'
            raise ValueError("Core systems check failed")
            
        # Check data layer
        if not await self._check_data_layer():
            validation['status'] = 'failed'
            raise ValueError("Data layer check failed")
            
        # Check API layer
        if not await self._check_api_layer():
            validation['status'] = 'failed'
            raise ValueError("API layer check failed")
            
    async def _collect_evidence(
        self,
        evidence: Dict
    ) -> None:
        """Collects validation evidence"""
        async with self._buffer_lock:
            component = evidence['component']
            self._validation_buffer[component].append(evidence)
            
            # Process buffer if needed
            if len(self._validation_buffer[component]) >= settings.VALIDATION_BUFFER_SIZE:
                await self._process_validation_buffer(component)
                
    async def _process_validation_buffer(
        self,
        component: Optional[CriticalPathComponent] = None
    ) -> None:
        """Processes validation buffer"""
        async with self._buffer_lock:
            components = [component] if component else list(self._validation_buffer.keys())
            
            for comp in components:
                if not self._validation_buffer[comp]:
                    continue
                    
                evidence_path = os.path.join(
                    settings.VALIDATION_EVIDENCE_PATH,
                    str(comp),
                    datetime.utcnow().strftime('%Y-%m-%d')
                )
                
                if not os.path.exists(evidence_path):
                    os.makedirs(evidence_path)
                    
                filename = f"{datetime.utcnow().isoformat()}.json"
                filepath = os.path.join(evidence_path, filename)
                
                with open(filepath, 'w') as f:
                    json.dump(self._validation_buffer[comp], f, indent=2)
                    
                self._validation_buffer[comp] = []
                
    async def _save_evidence(
        self,
        evidence: Dict,
        category: str
    ) -> None:
        """Saves validation evidence"""
        evidence_path = os.path.join(
            settings.VALIDATION_EVIDENCE_PATH,
            'critical_path',
            category
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['component']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring
        self.monitor.track_validation(f"critical_path_{evidence['component']}")
        
    async def _check_documentation(
        self,
        component: CriticalPathComponent
    ) -> bool:
        """Checks documentation requirements"""
        # Add documentation check logic
        return True
        
    async def _check_evidence(
        self,
        component: CriticalPathComponent
    ) -> bool:
        """Checks evidence requirements"""
        # Add evidence check logic
        return True
        
    async def _check_validation_system(self) -> bool:
        """Checks validation system"""
        # Add validation check logic
        return True
        
    async def _check_evidence_collection(self) -> bool:
        """Checks evidence collection"""
        # Add collection check logic
        return True
        
    async def _check_user_protection(self) -> bool:
        """Checks user protection"""
        # Add protection check logic
        return True
        
    async def _check_hipaa_compliance(self) -> bool:
        """Checks HIPAA compliance"""
        # Add HIPAA check logic
        return True
        
    async def _check_security_validation(self) -> bool:
        """Checks security validation"""
        # Add security check logic
        return True
        
    async def _check_security_evidence(self) -> bool:
        """Checks security evidence"""
        # Add evidence check logic
        return True
        
    async def _check_core_systems(self) -> bool:
        """Checks core systems"""
        # Add system check logic
        return True
        
    async def _check_data_layer(self) -> bool:
        """Checks data layer"""
        # Add data check logic
        return True
        
    async def _check_api_layer(self) -> bool:
        """Checks API layer"""
        # Add API check logic
        return True
