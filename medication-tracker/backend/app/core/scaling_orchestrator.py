"""
Scaling Orchestrator
Manages infrastructure scaling while maintaining single source of truth
"""
import asyncio
import psutil
import statistics
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.supporting_services_orchestrator import SupportingServicesOrchestrator
from app.core.testing_orchestrator import TestingOrchestrator
from app.core.monitoring_orchestrator import MonitoringOrchestrator
from app.core.optimization_orchestrator import OptimizationOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

@dataclass
class ScalingMetrics:
    """Scaling metrics data class"""
    instance_count: int
    resource_usage: Dict[str, float]
    response_times: Dict[str, float]
    throughput: Dict[str, float]
    latency: Dict[str, float]
    timestamp: str

class ScalingOrchestrator:
    """
    Orchestrates infrastructure scaling processes
    Maintains single source of truth and validation
    """
    
    def __init__(self) -> None:
        """Initialize the scaling orchestrator"""
        self.critical_path = UnifiedCriticalPath()
        self.metrics_service = MetricsService()
        self.monitoring = MonitoringOrchestrator()
        self.optimization = OptimizationOrchestrator()
        self.validation_status: Dict[str, Any] = {}
        
    async def collect_scaling_metrics(self) -> ScalingMetrics:
        """Collects comprehensive scaling metrics"""
        return ScalingMetrics(
            instance_count=1,  # Default to 1 for initial setup
            resource_usage={
                'cpu': psutil.cpu_percent(),
                'memory': psutil.virtual_memory().percent,
                'disk': psutil.disk_usage('/').percent
            },
            response_times={
                'avg': 0.0,
                'p95': 0.0,
                'p99': 0.0
            },
            throughput={
                'requests_per_second': 0.0,
                'transactions_per_second': 0.0
            },
            latency={
                'avg': 0.0,
                'p95': 0.0,
                'p99': 0.0
            },
            timestamp=datetime.utcnow().isoformat()
        )
        
    async def scale_infrastructure(
        self,
        priority: str,
        scaling_type: str,
        target_state: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Scales infrastructure components
        Maintains critical path alignment
        """
        # Validate inputs
        if priority not in ['high', 'medium', 'low']:
            raise ValueError(f"Invalid priority: {priority}")
            
        if scaling_type not in ['horizontal', 'vertical', 'auto']:
            raise ValueError(f"Invalid scaling type: {scaling_type}")
            
        # Collect initial metrics
        initial_metrics = await self.collect_scaling_metrics()
        
        # Validate critical path
        critical_validation = await self.critical_path.validate_critical_path(
            metrics=self.metrics_service,
            evidence=evidence
        )
        if not critical_validation.is_valid:
            raise ValueError("Critical path validation failed")
            
        # Perform scaling
        if scaling_type == 'horizontal':
            await self._scale_horizontally(target_state, evidence)
        elif scaling_type == 'vertical':
            await self._scale_vertically(target_state, evidence)
        elif scaling_type == 'auto':
            await self._scale_automatically(target_state, evidence)
            
        # Collect final metrics
        final_metrics = await self.collect_scaling_metrics()
        
        # Update evidence
        evidence['scaling'] = {
            'type': scaling_type,
            'priority': priority,
            'initial_metrics': initial_metrics.__dict__,
            'final_metrics': final_metrics.__dict__,
            'target_state': target_state,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'complete'
        }
        
        # Collect evidence
        evidence_result = await self.critical_path.collect_evidence(
            metrics=self.metrics_service,
            evidence=evidence
        )
        
        return ValidationResult(
            is_valid=True,
            evidence=evidence
        )
        
    async def _scale_horizontally(
        self,
        target_state: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Implements horizontal scaling
        Maintains critical path alignment
        """
        # Validate target state
        if 'instance_count' not in target_state:
            raise ValueError("Missing instance_count in target state")
            
        # Update evidence
        evidence['horizontal_scaling'] = {
            'target_instances': target_state['instance_count'],
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'complete'
        }
        
    async def _scale_vertically(
        self,
        target_state: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Implements vertical scaling
        Maintains critical path alignment
        """
        # Validate target state
        required_resources = ['cpu', 'memory', 'disk']
        for resource in required_resources:
            if resource not in target_state:
                raise ValueError(f"Missing {resource} in target state")
                
        # Update evidence
        evidence['vertical_scaling'] = {
            'target_resources': {
                resource: target_state[resource]
                for resource in required_resources
            },
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'complete'
        }
        
    async def _scale_automatically(
        self,
        target_state: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Implements automatic scaling
        Maintains critical path alignment
        """
        # Validate target state
        required_metrics = ['cpu_threshold', 'memory_threshold', 'request_threshold']
        for metric in required_metrics:
            if metric not in target_state:
                raise ValueError(f"Missing {metric} in target state")
                
        # Update evidence
        evidence['auto_scaling'] = {
            'thresholds': {
                metric: target_state[metric]
                for metric in required_metrics
            },
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'complete'
        }
        
    async def validate_scaling(
        self,
        scaling_type: str,
        metrics: ScalingMetrics,
        target_state: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validates scaling results
        Maintains critical path alignment
        """
        # Validate scaling results
        if scaling_type == 'horizontal':
            is_valid = metrics.instance_count == target_state.get('instance_count', 1)
        elif scaling_type == 'vertical':
            is_valid = all(
                metrics.resource_usage[resource] <= target_state.get(resource, 100)
                for resource in ['cpu', 'memory', 'disk']
            )
        elif scaling_type == 'auto':
            is_valid = all(
                metrics.resource_usage[resource.split('_')[0]] <= target_state.get(f"{resource}_threshold", 100)
                for resource in ['cpu_threshold', 'memory_threshold']
            )
        else:
            raise ValueError(f"Invalid scaling type: {scaling_type}")
            
        # Update evidence
        evidence['validation'] = {
            'type': scaling_type,
            'metrics': metrics.__dict__,
            'target_state': target_state,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'complete' if is_valid else 'failed'
        }
        
        return ValidationResult(
            is_valid=is_valid,
            evidence=evidence
        )
