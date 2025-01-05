"""
Service Migration Orchestrator
Manages service migration while maintaining critical path alignment
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
from app.core.beta_feature_orchestrator import BetaFeatureOrchestrator
from app.core.monitoring_orchestrator import MonitoringOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult

class ServicePriority(str, Enum):
    """Service priorities from SINGLE_SOURCE_VALIDATION.md"""
    SAFETY_CRITICAL = "safety_critical"
    SECURITY = "security"
    INFRASTRUCTURE = "infrastructure"
    SUPPORTING = "supporting"

class ServiceType(str, Enum):
    """Service types from SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION = "medication"
    VALIDATION = "validation"
    MONITORING = "monitoring"
    EVIDENCE = "evidence"

class ServiceMigrationOrchestrator:
    """
    Service Migration Orchestrator
    Manages service migration and maintains critical path alignment
    """
    
    def __init__(self):
        self.critical_path = UnifiedCriticalPath()
        self.beta_features = BetaFeatureOrchestrator()
        self.monitoring = MonitoringOrchestrator()
        self.metrics = MetricsService()
        self._migration_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def migrate_service(
        self,
        priority: ServicePriority,
        service_type: ServiceType,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """Migrates service while maintaining critical path"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'priority': priority,
            'type': service_type,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_critical_path(priority, service_type, data, evidence)
            
            # 2. Migration validation
            await self._validate_migration(priority, service_type, data, evidence)
            
            # 3. Service migration
            await self._migrate_service_impl(priority, service_type, data, evidence)
            
            # 4. Evidence collection
            await self._collect_migration_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_migration_evidence(evidence)
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='migration',
                name=f'{priority}_{service_type}_migration',
                value={
                    'status': 'success',
                    'type': service_type
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
            await self._save_migration_evidence(evidence)
            
            # Track error and alert
            await self._handle_migration_error(priority, service_type, str(e), evidence)
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _validate_critical_path(
        self,
        priority: ServicePriority,
        service_type: ServiceType,
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
        
        # Validate based on priority
        if priority == ServicePriority.SAFETY_CRITICAL:
            await self._validate_safety_critical(service_type, data, validation)
        elif priority == ServicePriority.SECURITY:
            await self._validate_security(service_type, data, validation)
        elif priority == ServicePriority.INFRASTRUCTURE:
            await self._validate_infrastructure(service_type, data, validation)
        elif priority == ServicePriority.SUPPORTING:
            await self._validate_supporting(service_type, data, validation)
            
        validation['status'] = 'complete'
        
    async def _validate_migration(
        self,
        priority: ServicePriority,
        service_type: ServiceType,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Validates migration requirements"""
        validation = {
            'type': 'migration',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Validate based on type
        if service_type == ServiceType.MEDICATION:
            await self._validate_medication_migration(priority, data, validation)
        elif service_type == ServiceType.VALIDATION:
            await self._validate_validation_migration(priority, data, validation)
        elif service_type == ServiceType.MONITORING:
            await self._validate_monitoring_migration(priority, data, validation)
        elif service_type == ServiceType.EVIDENCE:
            await self._validate_evidence_migration(priority, data, validation)
            
        validation['status'] = 'complete'
        
    async def _migrate_service_impl(
        self,
        priority: ServicePriority,
        service_type: ServiceType,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Implements service migration"""
        migration = {
            'type': 'service_migration',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['migration'] = evidence.get('migration', [])
        evidence['migration'].append(migration)
        
        # Migrate based on type
        if service_type == ServiceType.MEDICATION:
            await self._migrate_medication_service(priority, data, migration)
        elif service_type == ServiceType.VALIDATION:
            await self._migrate_validation_service(priority, data, migration)
        elif service_type == ServiceType.MONITORING:
            await self._migrate_monitoring_service(priority, data, migration)
        elif service_type == ServiceType.EVIDENCE:
            await self._migrate_evidence_service(priority, data, migration)
            
        migration['status'] = 'complete'
        
    async def _collect_migration_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Collects migration evidence"""
        async with self._buffer_lock:
            priority = evidence['priority']
            service_type = evidence['type']
            
            if priority not in self._migration_buffer:
                self._migration_buffer[priority] = {}
                
            if service_type not in self._migration_buffer[priority]:
                self._migration_buffer[priority][service_type] = []
                
            self._migration_buffer[priority][service_type].append(evidence)
            
            # Process if buffer gets too large
            if len(self._migration_buffer[priority][service_type]) >= settings.MIGRATION_BUFFER_SIZE:
                await self._process_migration_buffer(priority, service_type)
                
    async def _process_migration_buffer(
        self,
        priority: Optional[ServicePriority] = None,
        service_type: Optional[ServiceType] = None
    ) -> None:
        """Processes migration buffer"""
        async with self._buffer_lock:
            priorities = [priority] if priority else list(self._migration_buffer.keys())
            
            for p in priorities:
                types = [service_type] if service_type else list(self._migration_buffer[p].keys())
                
                for t in types:
                    if not self._migration_buffer[p][t]:
                        continue
                        
                    evidence_path = os.path.join(
                        settings.MIGRATION_EVIDENCE_PATH,
                        str(p),
                        str(t),
                        datetime.utcnow().strftime('%Y-%m-%d')
                    )
                    
                    if not os.path.exists(evidence_path):
                        os.makedirs(evidence_path)
                        
                    filename = f"{datetime.utcnow().isoformat()}.json"
                    filepath = os.path.join(evidence_path, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(self._migration_buffer[p][t], f, indent=2)
                        
                    self._migration_buffer[p][t] = []
                    
    async def _save_migration_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Saves migration evidence"""
        evidence_path = os.path.join(
            settings.MIGRATION_EVIDENCE_PATH,
            str(evidence['priority']),
            str(evidence['type'])
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
    async def _handle_migration_error(
        self,
        priority: ServicePriority,
        service_type: ServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles migration errors"""
        # Track error metric
        await self.metrics.track_metric(
            metric_type='migration_error',
            name=f'{priority}_{service_type}_error',
            value={
                'error': error,
                'priority': priority
            },
            priority='critical'
        )
        
        # Alert based on priority
        if priority == ServicePriority.SAFETY_CRITICAL:
            await self._handle_safety_critical_error(service_type, error, evidence)
        elif priority == ServicePriority.SECURITY:
            await self._handle_security_error(service_type, error, evidence)
        elif priority == ServicePriority.INFRASTRUCTURE:
            await self._handle_infrastructure_error(service_type, error, evidence)
        elif priority == ServicePriority.SUPPORTING:
            await self._handle_supporting_error(service_type, error, evidence)
            
    async def _validate_safety_critical(
        self,
        service_type: ServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates safety-critical requirements"""
        # Add safety-critical validation logic
        pass
        
    async def _validate_security(
        self,
        service_type: ServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates security requirements"""
        # Add security validation logic
        pass
        
    async def _validate_infrastructure(
        self,
        service_type: ServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates infrastructure requirements"""
        # Add infrastructure validation logic
        pass
        
    async def _validate_supporting(
        self,
        service_type: ServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates supporting requirements"""
        # Add supporting validation logic
        pass
        
    async def _validate_medication_migration(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates medication service migration"""
        # Add medication migration validation logic
        pass
        
    async def _validate_validation_migration(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates validation service migration"""
        # Add validation migration validation logic
        pass
        
    async def _validate_monitoring_migration(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates monitoring service migration"""
        # Add monitoring migration validation logic
        pass
        
    async def _validate_evidence_migration(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates evidence service migration"""
        # Add evidence migration validation logic
        pass
        
    async def _migrate_medication_service(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates medication service"""
        # Add medication service migration logic
        pass
        
    async def _migrate_validation_service(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates validation service"""
        # Add validation service migration logic
        pass
        
    async def _migrate_monitoring_service(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates monitoring service"""
        # Add monitoring service migration logic
        pass
        
    async def _migrate_evidence_service(
        self,
        priority: ServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates evidence service"""
        # Add evidence service migration logic
        pass
        
    async def _handle_safety_critical_error(
        self,
        service_type: ServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles safety-critical errors"""
        # Add safety-critical error handling logic
        pass
        
    async def _handle_security_error(
        self,
        service_type: ServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles security errors"""
        # Add security error handling logic
        pass
        
    async def _handle_infrastructure_error(
        self,
        service_type: ServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles infrastructure errors"""
        # Add infrastructure error handling logic
        pass
        
    async def _handle_supporting_error(
        self,
        service_type: ServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles supporting errors"""
        # Add supporting error handling logic
        pass
