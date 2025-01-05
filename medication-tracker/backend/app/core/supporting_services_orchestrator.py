"""
Supporting Services Orchestrator
Manages supporting services migration while maintaining critical path alignment
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
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult

class SupportingServiceType(str, Enum):
    """Supporting service types from SINGLE_SOURCE_VALIDATION.md"""
    ANALYTICS = "analytics"
    REPORTING = "reporting"
    NOTIFICATION = "notification"
    SCHEDULING = "scheduling"

class SupportingServicePriority(str, Enum):
    """Supporting service priorities from SINGLE_SOURCE_VALIDATION.md"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class SupportingServicesOrchestrator:
    """
    Supporting Services Orchestrator
    Manages supporting services migration and maintains critical path alignment
    """
    
    def __init__(self):
        self.critical_path = UnifiedCriticalPath()
        self.migration = ServiceMigrationOrchestrator()
        self.monitoring = MonitoringOrchestrator()
        self.metrics = MetricsService()
        self._migration_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def migrate_supporting_service(
        self,
        service_type: SupportingServiceType,
        priority: SupportingServicePriority,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """Migrates supporting service while maintaining critical path"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'service_type': service_type,
            'priority': priority,
            'status': 'pending'
        }
        
        try:
            # 1. Critical path validation
            await self._validate_critical_path(service_type, priority, data, evidence)
            
            # 2. Migration validation
            await self._validate_migration(service_type, priority, data, evidence)
            
            # 3. Service migration
            await self._migrate_service_impl(service_type, priority, data, evidence)
            
            # 4. Evidence collection
            await self._collect_migration_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_migration_evidence(evidence)
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='supporting_migration',
                name=f'{service_type}_{priority}_migration',
                value={
                    'status': 'success',
                    'type': service_type
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
            await self._save_migration_evidence(evidence)
            
            # Track error and alert
            await self._handle_migration_error(service_type, priority, str(e), evidence)
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _validate_critical_path(
        self,
        service_type: SupportingServiceType,
        priority: SupportingServicePriority,
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
        
        # Validate based on service type
        if service_type == SupportingServiceType.ANALYTICS:
            await self._validate_analytics(priority, data, validation)
        elif service_type == SupportingServiceType.REPORTING:
            await self._validate_reporting(priority, data, validation)
        elif service_type == SupportingServiceType.NOTIFICATION:
            await self._validate_notification(priority, data, validation)
        elif service_type == SupportingServiceType.SCHEDULING:
            await self._validate_scheduling(priority, data, validation)
            
        validation['status'] = 'complete'
        
    async def _validate_migration(
        self,
        service_type: SupportingServiceType,
        priority: SupportingServicePriority,
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
        
        # Validate based on priority
        if priority == SupportingServicePriority.HIGH:
            await self._validate_high_priority(service_type, data, validation)
        elif priority == SupportingServicePriority.MEDIUM:
            await self._validate_medium_priority(service_type, data, validation)
        elif priority == SupportingServicePriority.LOW:
            await self._validate_low_priority(service_type, data, validation)
            
        validation['status'] = 'complete'
        
    async def _migrate_service_impl(
        self,
        service_type: SupportingServiceType,
        priority: SupportingServicePriority,
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
        if service_type == SupportingServiceType.ANALYTICS:
            await self._migrate_analytics(priority, data, migration)
        elif service_type == SupportingServiceType.REPORTING:
            await self._migrate_reporting(priority, data, migration)
        elif service_type == SupportingServiceType.NOTIFICATION:
            await self._migrate_notification(priority, data, migration)
        elif service_type == SupportingServiceType.SCHEDULING:
            await self._migrate_scheduling(priority, data, migration)
            
        migration['status'] = 'complete'
        
    async def _collect_migration_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Collects migration evidence"""
        async with self._buffer_lock:
            service_type = evidence['service_type']
            priority = evidence['priority']
            
            if service_type not in self._migration_buffer:
                self._migration_buffer[service_type] = {}
                
            if priority not in self._migration_buffer[service_type]:
                self._migration_buffer[service_type][priority] = []
                
            self._migration_buffer[service_type][priority].append(evidence)
            
            # Process if buffer gets too large
            if len(self._migration_buffer[service_type][priority]) >= settings.MIGRATION_BUFFER_SIZE:
                await self._process_migration_buffer(service_type, priority)
                
    async def _process_migration_buffer(
        self,
        service_type: Optional[SupportingServiceType] = None,
        priority: Optional[SupportingServicePriority] = None
    ) -> None:
        """Processes migration buffer"""
        async with self._buffer_lock:
            types = [service_type] if service_type else list(self._migration_buffer.keys())
            
            for t in types:
                priorities = [priority] if priority else list(self._migration_buffer[t].keys())
                
                for p in priorities:
                    if not self._migration_buffer[t][p]:
                        continue
                        
                    evidence_path = os.path.join(
                        settings.MIGRATION_EVIDENCE_PATH,
                        'supporting',
                        str(t),
                        str(p),
                        datetime.utcnow().strftime('%Y-%m-%d')
                    )
                    
                    if not os.path.exists(evidence_path):
                        os.makedirs(evidence_path)
                        
                    filename = f"{datetime.utcnow().isoformat()}.json"
                    filepath = os.path.join(evidence_path, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(self._migration_buffer[t][p], f, indent=2)
                        
                    self._migration_buffer[t][p] = []
                    
    async def _save_migration_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Saves migration evidence"""
        evidence_path = os.path.join(
            settings.MIGRATION_EVIDENCE_PATH,
            'supporting',
            str(evidence['service_type']),
            str(evidence['priority'])
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
    async def _handle_migration_error(
        self,
        service_type: SupportingServiceType,
        priority: SupportingServicePriority,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles migration errors"""
        # Track error metric
        await self.metrics.track_metric(
            metric_type='supporting_migration_error',
            name=f'{service_type}_{priority}_error',
            value={
                'error': error,
                'priority': priority
            },
            priority='high'
        )
        
        # Alert based on priority
        if priority == SupportingServicePriority.HIGH:
            await self._handle_high_priority_error(service_type, error, evidence)
        elif priority == SupportingServicePriority.MEDIUM:
            await self._handle_medium_priority_error(service_type, error, evidence)
        elif priority == SupportingServicePriority.LOW:
            await self._handle_low_priority_error(service_type, error, evidence)
            
    async def _validate_analytics(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates analytics requirements"""
        # Add analytics validation logic
        pass
        
    async def _validate_reporting(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates reporting requirements"""
        # Add reporting validation logic
        pass
        
    async def _validate_notification(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates notification requirements"""
        # Add notification validation logic
        pass
        
    async def _validate_scheduling(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates scheduling requirements"""
        # Add scheduling validation logic
        pass
        
    async def _validate_high_priority(
        self,
        service_type: SupportingServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates high priority requirements"""
        # Add high priority validation logic
        pass
        
    async def _validate_medium_priority(
        self,
        service_type: SupportingServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates medium priority requirements"""
        # Add medium priority validation logic
        pass
        
    async def _validate_low_priority(
        self,
        service_type: SupportingServiceType,
        data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> None:
        """Validates low priority requirements"""
        # Add low priority validation logic
        pass
        
    async def _migrate_analytics(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates analytics service"""
        # Add analytics migration logic
        pass
        
    async def _migrate_reporting(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates reporting service"""
        # Add reporting migration logic
        pass
        
    async def _migrate_notification(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates notification service"""
        # Add notification migration logic
        pass
        
    async def _migrate_scheduling(
        self,
        priority: SupportingServicePriority,
        data: Dict[str, Any],
        migration: Dict[str, Any]
    ) -> None:
        """Migrates scheduling service"""
        # Add scheduling migration logic
        pass
        
    async def _handle_high_priority_error(
        self,
        service_type: SupportingServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles high priority errors"""
        # Add high priority error handling logic
        pass
        
    async def _handle_medium_priority_error(
        self,
        service_type: SupportingServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles medium priority errors"""
        # Add medium priority error handling logic
        pass
        
    async def _handle_low_priority_error(
        self,
        service_type: SupportingServiceType,
        error: str,
        evidence: Dict[str, Any]
    ) -> None:
        """Handles low priority errors"""
        # Add low priority error handling logic
        pass
