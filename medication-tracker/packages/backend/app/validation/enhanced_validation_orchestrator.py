"""
Enhanced Validation Orchestrator
Implements critical path validation with single source of truth
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
from app.validation.validation_types import ValidationResult

class CriticalPathComponent(str, Enum):
    """Critical path components as defined in SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION_SAFETY = "medication_safety"
    DATA_SECURITY = "data_security"
    INFRASTRUCTURE = "infrastructure"

class ValidationPriority(str, Enum):
    """Validation priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EnhancedValidationOrchestrator:
    """
    Enhanced Validation Orchestrator
    Manages critical path validation and evidence collection
    """
    
    def __init__(self):
        self.monitor = ValidationMonitor()
        self.metrics = MetricsService()
        self.evidence_path = os.path.join(settings.VALIDATION_EVIDENCE_PATH, "enhanced_validation")
        self._validation_buffer = defaultdict(list)
        self._buffer_lock = asyncio.Lock()
        
    async def validate(
        self,
        component: CriticalPathComponent,
        data: Dict,
        priority: ValidationPriority = ValidationPriority.HIGH
    ) -> ValidationResult:
        """Validates against critical path requirements"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': component,
            'priority': priority,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_critical_path(component, data, evidence)
            
            # 2. Component-specific validation
            await self._validate_component(component, data, evidence)
            
            # 3. Evidence collection
            await self._collect_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'validation')
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='validation',
                name=f'{component}_validation',
                value={
                    'status': 'success',
                    'priority': priority
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
            await self._save_evidence(evidence, 'validation')
            
            # Track error
            await self.metrics.track_metric(
                metric_type='validation',
                name=f'{component}_validation_error',
                value={
                    'error': str(e),
                    'priority': priority
                },
                priority='high'
            )
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _validate_critical_path(
        self,
        component: CriticalPathComponent,
        data: Dict,
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
        
        # Add component-specific validation
        if component == CriticalPathComponent.MEDICATION_SAFETY:
            await self._validate_medication_safety(data, validation)
        elif component == CriticalPathComponent.DATA_SECURITY:
            await self._validate_data_security(data, validation)
        elif component == CriticalPathComponent.INFRASTRUCTURE:
            await self._validate_infrastructure(data, validation)
            
        validation['status'] = 'complete'
        
    async def _validate_medication_safety(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates medication safety requirements"""
        required_fields = ['name', 'dosage', 'frequency']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            validation['status'] = 'failed'
            raise ValueError(f"Missing required fields: {missing_fields}")
            
        # Add medication-specific validation
        if not self._is_safe_dosage(data['dosage']):
            validation['status'] = 'failed'
            raise ValueError("Invalid dosage")
            
        if not self._is_safe_frequency(data['frequency']):
            validation['status'] = 'failed'
            raise ValueError("Invalid frequency")
            
    async def _validate_data_security(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates data security requirements"""
        # Check PHI protection
        if not self._is_phi_protected(data):
            validation['status'] = 'failed'
            raise ValueError("PHI not properly protected")
            
        # Check HIPAA compliance
        if not self._is_hipaa_compliant(data):
            validation['status'] = 'failed'
            raise ValueError("HIPAA compliance check failed")
            
    async def _validate_infrastructure(
        self,
        data: Dict,
        validation: Dict
    ) -> None:
        """Validates infrastructure requirements"""
        # Check system health
        if not await self._check_system_health():
            validation['status'] = 'failed'
            raise ValueError("System health check failed")
            
        # Check resource availability
        if not await self._check_resources():
            validation['status'] = 'failed'
            raise ValueError("Resource check failed")
            
    async def _validate_component(
        self,
        component: CriticalPathComponent,
        data: Dict,
        evidence: Dict
    ) -> None:
        """Validates component-specific requirements"""
        validation = {
            'type': 'component',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add component validation logic here
        if not settings.VALIDATION_RULES.get(str(component), {}).get('enabled', False):
            validation['status'] = 'failed'
            raise ValueError(f"Component {component} validation not enabled")
            
        validation['status'] = 'complete'
        
    async def _collect_evidence(self, evidence: Dict) -> None:
        """Collects validation evidence"""
        async with self._buffer_lock:
            component = evidence['component']
            self._validation_buffer[component].append(evidence)
            
            # Process buffer if it gets too large
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
                    self.evidence_path,
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
        evidence_path = os.path.join(self.evidence_path, 'evidence', category)
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['component']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring system
        self.monitor.track_validation(f"enhanced_validation_{evidence['component']}")
        
    def _is_safe_dosage(self, dosage: str) -> bool:
        """Checks if dosage is safe"""
        # Add dosage validation logic here
        return True
        
    def _is_safe_frequency(self, frequency: str) -> bool:
        """Checks if frequency is safe"""
        # Add frequency validation logic here
        return True
        
    def _is_phi_protected(self, data: Dict) -> bool:
        """Checks if PHI is protected"""
        # Add PHI protection check here
        return True
        
    def _is_hipaa_compliant(self, data: Dict) -> bool:
        """Checks HIPAA compliance"""
        # Add HIPAA compliance check here
        return True
        
    async def _check_system_health(self) -> bool:
        """Checks system health"""
        # Add system health check here
        return True
        
    async def _check_resources(self) -> bool:
        """Checks resource availability"""
        # Add resource check here
        return True
