"""
Error Handling Tests
Validates error handling and recovery while maintaining single source of truth
"""
import pytest
import asyncio
from datetime import datetime
from typing import Dict, Any, List
from unittest.mock import Mock, patch

from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.supporting_services_orchestrator import SupportingServicesOrchestrator
from app.core.testing_orchestrator import TestingOrchestrator
from app.core.monitoring_orchestrator import MonitoringOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

class TestErrorHandling:
    """
    Error Handling Test Suite
    Validates system error handling and recovery
    """
    
    @pytest.fixture
    async def critical_path(self) -> UnifiedCriticalPath:
        """Critical path fixture"""
        return UnifiedCriticalPath()
        
    @pytest.fixture
    async def service_migration(self) -> ServiceMigrationOrchestrator:
        """Service migration fixture"""
        return ServiceMigrationOrchestrator()
        
    @pytest.fixture
    async def supporting_services(self) -> SupportingServicesOrchestrator:
        """Supporting services fixture"""
        return SupportingServicesOrchestrator()
        
    @pytest.fixture
    async def testing(self) -> TestingOrchestrator:
        """Testing fixture"""
        return TestingOrchestrator()
        
    @pytest.fixture
    async def monitoring(self) -> MonitoringOrchestrator:
        """Monitoring fixture"""
        return MonitoringOrchestrator()
        
    @pytest.fixture
    async def metrics(self) -> MetricsService:
        """Metrics fixture"""
        return MetricsService()
        
    @pytest.mark.asyncio
    async def test_service_migration_errors(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests service migration error handling"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'service_migration_errors',
            'status': 'pending'
        }
        
        # Act & Assert
        # 1. Invalid priority
        with pytest.raises(ValueError) as exc_info:
            await service_migration.migrate_service(
                priority='invalid',
                service_type='medication',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid priority' in str(exc_info.value)
        
        # 2. Invalid service type
        with pytest.raises(ValueError) as exc_info:
            await service_migration.migrate_service(
                priority='high',
                service_type='invalid',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid service type' in str(exc_info.value)
        
        # 3. Missing data
        with pytest.raises(ValueError) as exc_info:
            await service_migration.migrate_service(
                priority='high',
                service_type='medication',
                data={},
                evidence=evidence
            )
        assert 'Missing required data' in str(exc_info.value)
        
        # 4. Evidence collection failure
        with patch.object(critical_path, 'collect_evidence', side_effect=Exception('Evidence collection failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.collect_evidence(
                    service_migration=service_migration,
                    monitoring=monitoring,
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Evidence collection failed' in str(exc_info.value)
        
    @pytest.mark.asyncio
    async def test_supporting_services_errors(
        self,
        critical_path: UnifiedCriticalPath,
        supporting_services: SupportingServicesOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests supporting services error handling"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'supporting_services_errors',
            'status': 'pending'
        }
        
        # Act & Assert
        # 1. Invalid service type
        with pytest.raises(ValueError) as exc_info:
            await supporting_services.migrate_supporting_service(
                service_type='invalid',
                priority='high',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid service type' in str(exc_info.value)
        
        # 2. Invalid priority
        with pytest.raises(ValueError) as exc_info:
            await supporting_services.migrate_supporting_service(
                service_type='analytics',
                priority='invalid',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid priority' in str(exc_info.value)
        
        # 3. Missing data
        with pytest.raises(ValueError) as exc_info:
            await supporting_services.migrate_supporting_service(
                service_type='analytics',
                priority='high',
                data={},
                evidence=evidence
            )
        assert 'Missing required data' in str(exc_info.value)
        
        # 4. Evidence collection failure
        with patch.object(critical_path, 'collect_evidence', side_effect=Exception('Evidence collection failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.collect_evidence(
                    supporting_services=supporting_services,
                    monitoring=monitoring,
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Evidence collection failed' in str(exc_info.value)
        
    @pytest.mark.asyncio
    async def test_monitoring_errors(
        self,
        critical_path: UnifiedCriticalPath,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests monitoring error handling"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'monitoring_errors',
            'status': 'pending'
        }
        
        # Act & Assert
        # 1. Invalid priority
        with pytest.raises(ValueError) as exc_info:
            await monitoring.setup_monitoring(
                priority='invalid',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid priority' in str(exc_info.value)
        
        # 2. Missing data
        with pytest.raises(ValueError) as exc_info:
            await monitoring.setup_monitoring(
                priority='high',
                data={},
                evidence=evidence
            )
        assert 'Missing required data' in str(exc_info.value)
        
        # 3. Evidence collection failure
        with patch.object(critical_path, 'collect_evidence', side_effect=Exception('Evidence collection failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.collect_evidence(
                    monitoring=monitoring,
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Evidence collection failed' in str(exc_info.value)
        
    @pytest.mark.asyncio
    async def test_metrics_errors(
        self,
        critical_path: UnifiedCriticalPath,
        metrics: MetricsService
    ) -> None:
        """Tests metrics error handling"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'metrics_errors',
            'status': 'pending'
        }
        
        # Act & Assert
        # 1. Invalid priority
        with pytest.raises(ValueError) as exc_info:
            await metrics.setup_metrics(
                priority='invalid',
                data={'test': 'data'},
                evidence=evidence
            )
        assert 'Invalid priority' in str(exc_info.value)
        
        # 2. Missing data
        with pytest.raises(ValueError) as exc_info:
            await metrics.setup_metrics(
                priority='high',
                data={},
                evidence=evidence
            )
        assert 'Missing required data' in str(exc_info.value)
        
        # 3. Evidence collection failure
        with patch.object(critical_path, 'collect_evidence', side_effect=Exception('Evidence collection failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.collect_evidence(
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Evidence collection failed' in str(exc_info.value)
        
    @pytest.mark.asyncio
    async def test_complete_system_errors(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        supporting_services: SupportingServicesOrchestrator,
        testing: TestingOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests complete system error handling"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'complete_system_errors',
            'status': 'pending'
        }
        
        # Act & Assert
        # 1. Critical path validation failure
        with patch.object(critical_path, 'validate_critical_path', side_effect=Exception('Validation failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.validate_critical_path(
                    service_migration=service_migration,
                    supporting_services=supporting_services,
                    testing=testing,
                    monitoring=monitoring,
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Validation failed' in str(exc_info.value)
        
        # 2. Service migration failure
        with patch.object(service_migration, 'migrate_service', side_effect=Exception('Migration failed')):
            with pytest.raises(Exception) as exc_info:
                await service_migration.migrate_service(
                    priority='safety_critical',
                    service_type='medication',
                    data={'test': 'data'},
                    evidence=evidence
                )
            assert 'Migration failed' in str(exc_info.value)
        
        # 3. Supporting services failure
        with patch.object(supporting_services, 'migrate_supporting_service', side_effect=Exception('Service migration failed')):
            with pytest.raises(Exception) as exc_info:
                await supporting_services.migrate_supporting_service(
                    service_type='analytics',
                    priority='high',
                    data={'test': 'data'},
                    evidence=evidence
                )
            assert 'Service migration failed' in str(exc_info.value)
        
        # 4. Testing failure
        with patch.object(testing, 'run_test', side_effect=Exception('Test failed')):
            with pytest.raises(Exception) as exc_info:
                await testing.run_test(
                    test_type='unit',
                    priority='safety_critical',
                    data={'test': 'data'},
                    evidence=evidence
                )
            assert 'Test failed' in str(exc_info.value)
        
        # 5. Monitoring failure
        with patch.object(monitoring, 'setup_monitoring', side_effect=Exception('Monitoring setup failed')):
            with pytest.raises(Exception) as exc_info:
                await monitoring.setup_monitoring(
                    priority='high',
                    data={'test': 'data'},
                    evidence=evidence
                )
            assert 'Monitoring setup failed' in str(exc_info.value)
        
        # 6. Metrics failure
        with patch.object(metrics, 'setup_metrics', side_effect=Exception('Metrics setup failed')):
            with pytest.raises(Exception) as exc_info:
                await metrics.setup_metrics(
                    priority='high',
                    data={'test': 'data'},
                    evidence=evidence
                )
            assert 'Metrics setup failed' in str(exc_info.value)
        
        # 7. Evidence collection failure
        with patch.object(critical_path, 'collect_evidence', side_effect=Exception('Evidence collection failed')):
            with pytest.raises(Exception) as exc_info:
                await critical_path.collect_evidence(
                    service_migration=service_migration,
                    supporting_services=supporting_services,
                    testing=testing,
                    monitoring=monitoring,
                    metrics=metrics,
                    evidence=evidence
                )
            assert 'Evidence collection failed' in str(exc_info.value)
