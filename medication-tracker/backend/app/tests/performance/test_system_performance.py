"""
System Performance Tests
Validates system performance and optimization while maintaining single source of truth
"""
import pytest
import asyncio
import time
import psutil
import statistics
from datetime import datetime
from typing import Dict, Any, List, Tuple
from unittest.mock import Mock, patch

from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.supporting_services_orchestrator import SupportingServicesOrchestrator
from app.core.testing_orchestrator import TestingOrchestrator
from app.core.monitoring_orchestrator import MonitoringOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

class TestSystemPerformance:
    """
    System Performance Test Suite
    Validates system performance and optimization
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
        
    async def _collect_system_metrics(self) -> Dict[str, float]:
        """Collects system metrics"""
        return {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_usage_percent': psutil.disk_usage('/').percent,
            'network_bytes_sent': psutil.net_io_counters().bytes_sent,
            'network_bytes_recv': psutil.net_io_counters().bytes_recv
        }
        
    async def _collect_performance_metrics(
        self,
        operation: str,
        metrics_before: Dict[str, float],
        metrics_after: Dict[str, float],
        response_times: List[float],
        evidence: Dict[str, Any]
    ) -> None:
        """Collects and validates performance metrics"""
        performance_metrics = {
            'operation': operation,
            'timestamp': datetime.utcnow().isoformat(),
            'sample_size': len(response_times),
            'response_times': {
                'min': min(response_times),
                'max': max(response_times),
                'avg': statistics.mean(response_times),
                'median': statistics.median(response_times),
                'p95': statistics.quantiles(response_times, n=20)[18],
                'p99': statistics.quantiles(response_times, n=100)[98]
            },
            'system_impact': {
                'cpu_impact': metrics_after['cpu_percent'] - metrics_before['cpu_percent'],
                'memory_impact': metrics_after['memory_percent'] - metrics_before['memory_percent'],
                'disk_impact': metrics_after['disk_usage_percent'] - metrics_before['disk_usage_percent'],
                'network_impact': {
                    'bytes_sent': metrics_after['network_bytes_sent'] - metrics_before['network_bytes_sent'],
                    'bytes_recv': metrics_after['network_bytes_recv'] - metrics_before['network_bytes_recv']
                }
            }
        }
        
        evidence['performance_metrics'] = evidence.get('performance_metrics', [])
        evidence['performance_metrics'].append(performance_metrics)
        
        # Validate against performance thresholds
        assert performance_metrics['response_times']['p95'] < 1.0, f"95th percentile response time exceeds 1 second for {operation}"
        assert performance_metrics['response_times']['p99'] < 2.0, f"99th percentile response time exceeds 2 seconds for {operation}"
        assert performance_metrics['system_impact']['cpu_impact'] < 50, f"CPU impact exceeds 50% for {operation}"
        assert performance_metrics['system_impact']['memory_impact'] < 30, f"Memory impact exceeds 30% for {operation}"
        
    @pytest.mark.asyncio
    async def test_service_migration_performance(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests service migration performance"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'service_migration_performance',
            'status': 'pending'
        }
        response_times = []
        
        # Act
        metrics_before = await self._collect_system_metrics()
        
        for _ in range(10):  # Run multiple iterations
            start_time = time.time()
            
            # 1. Critical path validation
            critical_validation = await critical_path.validate_critical_path(
                service_migration=service_migration,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert critical_validation.is_valid
            
            # 2. Service migration
            migration_result = await service_migration.migrate_service(
                priority='safety_critical',
                service_type='medication',
                data={'test': 'data'},
                evidence=evidence
            )
            assert migration_result.is_valid
            
            # 3. Evidence collection
            evidence_result = await critical_path.collect_evidence(
                service_migration=service_migration,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert evidence_result.is_valid
            
            end_time = time.time()
            response_times.append(end_time - start_time)
            
        metrics_after = await self._collect_system_metrics()
        
        # Collect and validate metrics
        await self._collect_performance_metrics(
            'service_migration',
            metrics_before,
            metrics_after,
            response_times,
            evidence
        )
        
        # Assert
        assert evidence['status'] == 'complete'
        assert 'performance_metrics' in evidence
        assert len(evidence['performance_metrics']) > 0
        
    @pytest.mark.asyncio
    async def test_supporting_services_performance(
        self,
        critical_path: UnifiedCriticalPath,
        supporting_services: SupportingServicesOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests supporting services performance"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'supporting_services_performance',
            'status': 'pending'
        }
        response_times = []
        
        # Act
        metrics_before = await self._collect_system_metrics()
        
        for _ in range(10):  # Run multiple iterations
            start_time = time.time()
            
            # 1. Critical path validation
            critical_validation = await critical_path.validate_critical_path(
                supporting_services=supporting_services,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert critical_validation.is_valid
            
            # 2. Supporting services
            services_result = await supporting_services.migrate_supporting_service(
                service_type='analytics',
                priority='high',
                data={'test': 'data'},
                evidence=evidence
            )
            assert services_result.is_valid
            
            # 3. Evidence collection
            evidence_result = await critical_path.collect_evidence(
                supporting_services=supporting_services,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert evidence_result.is_valid
            
            end_time = time.time()
            response_times.append(end_time - start_time)
            
        metrics_after = await self._collect_system_metrics()
        
        # Collect and validate metrics
        await self._collect_performance_metrics(
            'supporting_services',
            metrics_before,
            metrics_after,
            response_times,
            evidence
        )
        
        # Assert
        assert evidence['status'] == 'complete'
        assert 'performance_metrics' in evidence
        assert len(evidence['performance_metrics']) > 0
        
    @pytest.mark.asyncio
    async def test_complete_system_performance(
        self,
        critical_path: UnifiedCriticalPath,
        service_migration: ServiceMigrationOrchestrator,
        supporting_services: SupportingServicesOrchestrator,
        testing: TestingOrchestrator,
        monitoring: MonitoringOrchestrator,
        metrics: MetricsService
    ) -> None:
        """Tests complete system performance"""
        # Arrange
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'test': 'complete_system_performance',
            'status': 'pending'
        }
        response_times = []
        
        # Act
        metrics_before = await self._collect_system_metrics()
        
        for _ in range(5):  # Run multiple iterations
            start_time = time.time()
            
            # 1. Critical path validation
            critical_validation = await critical_path.validate_critical_path(
                service_migration=service_migration,
                supporting_services=supporting_services,
                testing=testing,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert critical_validation.is_valid
            
            # 2. Service migration
            migration_result = await service_migration.migrate_service(
                priority='safety_critical',
                service_type='medication',
                data={'test': 'data'},
                evidence=evidence
            )
            assert migration_result.is_valid
            
            # 3. Supporting services
            services_result = await supporting_services.migrate_supporting_service(
                service_type='analytics',
                priority='high',
                data={'test': 'data'},
                evidence=evidence
            )
            assert services_result.is_valid
            
            # 4. Testing setup
            testing_result = await testing.run_test(
                test_type='unit',
                priority='safety_critical',
                data={'test': 'data'},
                evidence=evidence
            )
            assert testing_result.is_valid
            
            # 5. Monitoring setup
            monitoring_result = await monitoring.setup_monitoring(
                priority='high',
                data={'test': 'data'},
                evidence=evidence
            )
            assert monitoring_result.is_valid
            
            # 6. Metrics setup
            metrics_result = await metrics.setup_metrics(
                priority='high',
                data={'test': 'data'},
                evidence=evidence
            )
            assert metrics_result.is_valid
            
            # 7. Evidence collection
            evidence_result = await critical_path.collect_evidence(
                service_migration=service_migration,
                supporting_services=supporting_services,
                testing=testing,
                monitoring=monitoring,
                metrics=metrics,
                evidence=evidence
            )
            assert evidence_result.is_valid
            
            end_time = time.time()
            response_times.append(end_time - start_time)
            
        metrics_after = await self._collect_system_metrics()
        
        # Collect and validate metrics
        await self._collect_performance_metrics(
            'complete_system',
            metrics_before,
            metrics_after,
            response_times,
            evidence
        )
        
        # Assert
        assert evidence['status'] == 'complete'
        assert 'performance_metrics' in evidence
        assert len(evidence['performance_metrics']) > 0
        assert all(v['status'] == 'complete' for v in evidence.get('validations', []))
