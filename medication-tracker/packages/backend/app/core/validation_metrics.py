"""
Validation Metrics
Tracks and manages validation metrics across the application
Last Updated: 2024-12-31T15:52:29+01:00
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pathlib import Path
import json
import logging

from .beta_settings import BetaSettings
from .validation_types import ValidationLevel, ValidationStatus

class MetricType(Enum):
    """Types of validation metrics"""
    COVERAGE = "coverage"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    SUCCESS_RATE = "success_rate"
    VALIDATION_TIME = "validation_time"

@dataclass
class ValidationMetric:
    """Individual validation metric"""
    type: MetricType
    value: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    level: ValidationLevel = ValidationLevel.INFO
    status: ValidationStatus = ValidationStatus.PENDING
    details: Dict = field(default_factory=dict)

class ValidationMetrics:
    """Manages validation metrics collection and analysis"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        self._metrics: Dict[str, List[ValidationMetric]] = {}
        
    async def record_metric(
        self,
        component: str,
        metric_type: MetricType,
        value: float,
        level: ValidationLevel = ValidationLevel.INFO,
        status: ValidationStatus = ValidationStatus.PENDING,
        details: Optional[Dict] = None
    ) -> Dict:
        """Record a validation metric"""
        try:
            # Create metrics directory
            metrics_dir = self.settings.BETA_BASE_PATH / "metrics"
            metrics_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate metric ID
            metric_id = f"METRIC-{component}-{metric_type.value}-{datetime.utcnow().timestamp()}"
            
            # Create metric record
            metric = ValidationMetric(
                type=metric_type,
                value=value,
                level=level,
                status=status,
                details=details or {}
            )
            metric_data = {
                "metric_id": metric_id,
                "component": component,
                "type": metric_type.value,
                "value": value,
                "level": level.value,
                "status": status.value,
                "details": details or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Save metric
            metric_file = metrics_dir / f"{metric_id}.json"
            with open(metric_file, "w") as f:
                json.dump(metric_data, f, indent=2)
                
            # Add metric to in-memory collection
            if component not in self._metrics:
                self._metrics[component] = []
            self._metrics[component].append(metric)
                
            return {
                "success": True,
                "metric_id": metric_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to record metric: {str(e)}")
            return {
                "success": False,
                "error": "Failed to record metric",
                "details": str(e)
            }
            
    async def get_metrics(
        self,
        component: str,
        metric_type: Optional[MetricType] = None
    ) -> List[ValidationMetric]:
        """Get metrics for a component"""
        metrics = self._metrics.get(component, [])
        if metric_type:
            metrics = [m for m in metrics if m.type == metric_type]
        return metrics
        
    async def get_latest_metric(
        self,
        component: str,
        metric_type: MetricType
    ) -> Optional[ValidationMetric]:
        """Get latest metric for a component and type"""
        metrics = await self.get_metrics(component, metric_type)
        return metrics[-1] if metrics else None
        
    async def clear_metrics(self, component: str) -> None:
        """Clear metrics for a component"""
        if component in self._metrics:
            del self._metrics[component]

class MetricType(Enum):
    """Types of metrics that can be collected"""
    VALIDATION = "validation"
    PERFORMANCE = "performance" 
    SECURITY = "security"
    USAGE = "usage"

@dataclass
class MetricContext:
    """Context for a collected metric"""
    component: str
    metric_type: MetricType
    tags: Dict[str, str]

class MetricsCollector:
    """Collects and manages metrics"""
    
    def __init__(self):
        self._metrics: List[Dict[str, Any]] = []
        
    async def collect_metric(
        self,
        context: MetricContext,
        value: float,
        level: ValidationLevel,
        status: ValidationStatus,
        details: Optional[Dict] = None
    ) -> None:
        """
        Collect a new metric
        
        Args:
            context: The metric context
            value: The metric value
            level: Validation level
            status: Validation status
            details: Optional details about the metric
        """
        metric = {
            "timestamp": datetime.utcnow().isoformat(),
            "component": context.component,
            "type": context.metric_type.value,
            "tags": context.tags,
            "value": value,
            "level": level.value,
            "status": status.value,
            "details": details or {}
        }
        self._metrics.append(metric)
        
    def get_metrics(
        self,
        component: Optional[str] = None,
        metric_type: Optional[MetricType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get collected metrics with optional filtering
        
        Args:
            component: Filter by component
            metric_type: Filter by metric type
            start_time: Filter metrics after this time
            end_time: Filter metrics before this time
            
        Returns:
            List of matching metrics
        """
        filtered = self._metrics
        
        if component:
            filtered = [m for m in filtered if m["component"] == component]
            
        if metric_type:
            filtered = [m for m in filtered if m["type"] == metric_type.value]
            
        if start_time:
            filtered = [m for m in filtered if datetime.fromisoformat(m["timestamp"]) >= start_time]
            
        if end_time:
            filtered = [m for m in filtered if datetime.fromisoformat(m["timestamp"]) <= end_time]
            
        return filtered

# Global instance
validation_metrics = ValidationMetrics()
metrics_collector = MetricsCollector()
