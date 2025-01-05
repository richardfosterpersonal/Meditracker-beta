"""
Critical Path Unit Tests
Validates critical path components while maintaining single source of truth
"""
import pytest
import asyncio
from datetime import datetime
from typing import Dict, Any
from unittest.mock import Mock, patch

from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.supporting_services_orchestrator import SupportingServicesOrchestrator
from app.core.testing_orchestrator import TestingOrchestrator
from app.core.monitoring_orchestrator import MonitoringOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

class TestCriticalPath:
    """
    Critical Path Test Suite
    Validates core components and their interactions
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
    async def test_critical_path_validation(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        supporting_services: SupportingServicesOrchestrator,
        testing: TestingOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests critical path validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'critical_path',
            'status': 'pending'
        }
        
        # Act
        validation = await critical_path.validate_critical_path(
            service_migration=service_migration,
            supporting_services=supporting_services,
            testing=testing,
            monitoring=monitoring,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_service_migration_validation(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests service migration validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'service_migration',
            'status': 'pending'
        }
        
        # Act
        validation = await service_migration.validate_migration(
            critical_path=critical_path,
            monitoring=monitoring,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_supporting_services_validation(
        self,
        critical_path: UnifiedCriticalPath,
        supporting_services: SupportingServicesOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests supporting services validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'supporting_services',
            'status': 'pending'
        }
        
        # Act
        validation = await supporting_services.validate_services(
            critical_path=critical_path,
            monitoring=monitoring,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_testing_validation(
        self,
        critical_path: UnifiedCriticalPath,
        testing: TestingOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests testing validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'testing',
            'status': 'pending'
        }
        
        # Act
        validation = await testing.validate_testing(
            critical_path=critical_path,
            monitoring=monitoring,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_monitoring_validation(
        self,
        critical_path: UnifiedCriticalPath,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests monitoring validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'monitoring',
            'status': 'pending'
        }
        
        # Act
        validation = await monitoring.validate_monitoring(
            critical_path=critical_path,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_metrics_validation(
        self,
        critical_path: UnifiedCriticalPath,
        metrics: MetricsService
    ) -> None:
        """Tests metrics validation"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'metrics',
            'status': 'pending'
        }
        
        # Act
        validation = await metrics.validate_metrics(
            critical_path=critical_path,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        
    @pytest.mark.asyncio
    async def test_evidence_collection(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        supporting_services: SupportingServicesOrchestrator,
        testing: TestingOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests evidence collection"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': 'evidence',
            'status': 'pending'
        }
        
        # Act
        validation = await critical_path.collect_evidence(
            service_migration=service_migration,
            supporting_services=supporting_services,
            testing=testing,
            monitoring=monitoring,
            metrics=metrics,
            evidence=evidence
        )
        
        # Assert
        assert validation.is_valid
        assert validation.evidence['status'] == 'complete'
        assert 'validations' in validation.evidence
        assert len(validation.evidence['validations']) > 0
        assert 'evidence_collection' in validation.evidence
        assert len(validation.evidence['evidence_collection']) > 0
