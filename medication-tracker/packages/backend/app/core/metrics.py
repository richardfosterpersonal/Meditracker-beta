"""
Metrics Collection System
Collects and manages application metrics
Last Updated: 2024-12-31T15:52:29+01:00
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum
import logging
import asyncio
from pathlib import Path

from .validation_types import ValidationLevel, ValidationStatus
from .validation_metrics import MetricType, ValidationMetric

@dataclass
class MetricContext:
    """Context for metric collection"""
    component: str
    metric_type: MetricType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    tags: Dict[str, str] = field(default_factory=dict)

class MetricsCollector:
    """Collects and manages application metrics"""
    
    def __init__(self):
        self._metrics: Dict[str, List[ValidationMetric]] = {}
        self._collection_lock = asyncio.Lock()
        self.logger = logging.getLogger(__name__)
        
    async def collect_metric(
        self,
        context: MetricContext,
        value: float,
        level: ValidationLevel = ValidationLevel.INFO,
        status: ValidationStatus = ValidationStatus.PENDING,
        details: Optional[Dict] = None
    ) -> ValidationMetric:
        """Collect a new metric"""
        async with self._collection_lock:
            metric = ValidationMetric(
                type=context.metric_type,
                value=value,
                timestamp=context.timestamp,
                level=level,
                status=status,
                details=details or {}
            )
            
            if context.component not in self._metrics:
                self._metrics[context.component] = []
            self._metrics[context.component].append(metric)
            
            return metric
            
    def get_metrics(
        self,
        component: str,
        metric_type: Optional[MetricType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[ValidationMetric]:
        """Get metrics for a component"""
        metrics = self._metrics.get(component, [])
        
        if metric_type:
            metrics = [m for m in metrics if m.type == metric_type]
            
        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
            
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]
            
        return metrics
        
    def get_latest_metric(
        self,
        component: str,
        metric_type: MetricType
    ) -> Optional[ValidationMetric]:
        """Get latest metric for a component and type"""
        metrics = self.get_metrics(component, metric_type)
        return metrics[-1] if metrics else None
        
    def clear_metrics(
        self,
        component: Optional[str] = None,
        older_than: Optional[datetime] = None
    ) -> None:
        """Clear metrics"""
        if component:
            if component in self._metrics:
                if older_than:
                    self._metrics[component] = [
                        m for m in self._metrics[component]
                        if m.timestamp >= older_than
                    ]
                else:
                    del self._metrics[component]
        else:
            if older_than:
                for component in self._metrics:
                    self._metrics[component] = [
                        m for m in self._metrics[component]
                        if m.timestamp >= older_than
                    ]
            else:
                self._metrics.clear()

# Global instance
metrics_collector = MetricsCollector()
