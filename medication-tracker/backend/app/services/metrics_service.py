"""
Metrics Service
Implements usage tracking and performance metrics
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
from typing import Dict, List, Optional, Union
from datetime import datetime
import json
import os
from enum import Enum
import time
import asyncio
from collections import defaultdict

from app.core.config import settings
from app.validation.validation_orchestrator import ValidationOrchestrator
from app.core.validation_monitoring import ValidationMonitor

class MetricType(str, Enum):
    """Metric types aligned with critical path"""
    USAGE = "usage"
    PERFORMANCE = "performance"
    SECURITY = "security"

class MetricPriority(str, Enum):
    """Metric priority levels"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class MetricsService:
    """
    Metrics Service
    Manages metrics collection and analysis
    """
    
    def __init__(self):
        self.validator = ValidationOrchestrator()
        self.monitor = ValidationMonitor()
        self.metrics_path = os.path.join(settings.VALIDATION_EVIDENCE_PATH, "metrics")
        self._metrics_buffer = defaultdict(list)
        self._buffer_lock = asyncio.Lock()
        
    async def track_metric(
        self,
        metric_type: MetricType,
        name: str,
        value: Union[str, int, float, Dict],
        priority: MetricPriority = MetricPriority.MEDIUM
    ) -> Dict:
        """Tracks a single metric"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'metric_type': metric_type,
            'name': name,
            'value': value,
            'priority': priority,
            'status': 'pending'
        }
        
        try:
            # 1. Validate metric
            await self._validate_metric(metric_type, name, value, evidence)
            
            # 2. Buffer metric
            await self._buffer_metric(evidence)
            
            # 3. Process if high priority
            if priority == MetricPriority.HIGH:
                await self._process_metrics()
                
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'tracking')
            
            return {
                'status': 'success',
                'evidence': evidence
            }
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence, 'tracking')
            
            return {
                'status': 'error',
                'evidence': evidence,
                'error': str(e)
            }
            
    async def track_performance(
        self,
        component: str,
        action: str,
        duration: float,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Tracks performance metrics"""
        return await self.track_metric(
            metric_type=MetricType.PERFORMANCE,
            name=f"{component}.{action}",
            value={
                'duration': duration,
                'metadata': metadata or {}
            },
            priority=MetricPriority.HIGH
        )
        
    async def track_usage(
        self,
        feature: str,
        action: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Tracks usage metrics"""
        return await self.track_metric(
            metric_type=MetricType.USAGE,
            name=f"{feature}.{action}",
            value={
                'user_id': user_id,
                'metadata': metadata or {}
            },
            priority=MetricPriority.MEDIUM
        )
        
    async def track_security(
        self,
        event_type: str,
        status: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Tracks security metrics"""
        return await self.track_metric(
            metric_type=MetricType.SECURITY,
            name=event_type,
            value={
                'status': status,
                'user_id': user_id,
                'metadata': metadata or {}
            },
            priority=MetricPriority.HIGH
        )
        
    async def get_metrics(
        self,
        metric_type: Optional[MetricType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict:
        """Retrieves metrics based on criteria"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'metric_type': metric_type,
            'start_time': start_time.isoformat() if start_time else None,
            'end_time': end_time.isoformat() if end_time else None,
            'status': 'pending'
        }
        
        try:
            # 1. Process any buffered metrics
            await self._process_metrics()
            
            # 2. Load metrics
            metrics = await self._load_metrics(metric_type, start_time, end_time)
            evidence['metrics'] = metrics
            
            evidence['status'] = 'complete'
            await self._save_evidence(evidence, 'retrieval')
            
            return {
                'status': 'success',
                'metrics': metrics,
                'evidence': evidence
            }
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            await self._save_evidence(evidence, 'retrieval')
            
            return {
                'status': 'error',
                'evidence': evidence,
                'error': str(e)
            }
            
    async def _validate_metric(
        self,
        metric_type: MetricType,
        name: str,
        value: Union[str, int, float, Dict],
        evidence: Dict
    ) -> None:
        """Validates metric requirements"""
        validation = {
            'type': 'metric_validation',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'] = evidence.get('validations', [])
        evidence['validations'].append(validation)
        
        # Validate against critical path
        result = await self.validator.validate_critical_path(
            component='metrics',
            action=f'validate_{metric_type}'
        )
        
        if result['status'] != 'success':
            validation['status'] = 'failed'
            raise ValueError(f"Metric validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    async def _buffer_metric(self, evidence: Dict) -> None:
        """Buffers metric for batch processing"""
        async with self._buffer_lock:
            metric_type = evidence['metric_type']
            self._metrics_buffer[metric_type].append(evidence)
            
            # Process buffer if it gets too large
            if len(self._metrics_buffer[metric_type]) >= settings.METRICS_BUFFER_SIZE:
                await self._process_metrics(metric_type)
                
    async def _process_metrics(
        self,
        metric_type: Optional[MetricType] = None
    ) -> None:
        """Processes buffered metrics"""
        async with self._buffer_lock:
            types_to_process = [metric_type] if metric_type else list(self._metrics_buffer.keys())
            
            for mtype in types_to_process:
                if not self._metrics_buffer[mtype]:
                    continue
                    
                metrics_path = os.path.join(
                    self.metrics_path,
                    str(mtype),
                    datetime.utcnow().strftime('%Y-%m-%d')
                )
                
                if not os.path.exists(metrics_path):
                    os.makedirs(metrics_path)
                    
                filename = f"{datetime.utcnow().isoformat()}.json"
                filepath = os.path.join(metrics_path, filename)
                
                with open(filepath, 'w') as f:
                    json.dump(self._metrics_buffer[mtype], f, indent=2)
                    
                self._metrics_buffer[mtype] = []
                
    async def _load_metrics(
        self,
        metric_type: Optional[MetricType],
        start_time: Optional[datetime],
        end_time: Optional[datetime]
    ) -> List[Dict]:
        """Loads metrics from storage"""
        metrics = []
        types_to_load = [metric_type] if metric_type else list(MetricType)
        
        for mtype in types_to_load:
            metrics_path = os.path.join(self.metrics_path, str(mtype))
            if not os.path.exists(metrics_path):
                continue
                
            for date_dir in os.listdir(metrics_path):
                date_path = os.path.join(metrics_path, date_dir)
                if not os.path.isdir(date_path):
                    continue
                    
                for filename in os.listdir(date_path):
                    if not filename.endswith('.json'):
                        continue
                        
                    filepath = os.path.join(date_path, filename)
                    with open(filepath, 'r') as f:
                        file_metrics = json.load(f)
                        
                    # Filter by time range
                    if start_time or end_time:
                        file_metrics = [
                            m for m in file_metrics
                            if self._is_metric_in_range(m, start_time, end_time)
                        ]
                        
                    metrics.extend(file_metrics)
                    
        return metrics
        
    def _is_metric_in_range(
        self,
        metric: Dict,
        start_time: Optional[datetime],
        end_time: Optional[datetime]
    ) -> bool:
        """Checks if metric is within time range"""
        metric_time = datetime.fromisoformat(metric['timestamp'])
        
        if start_time and metric_time < start_time:
            return False
            
        if end_time and metric_time > end_time:
            return False
            
        return True
        
    async def _save_evidence(
        self,
        evidence: Dict,
        category: str
    ) -> None:
        """Saves validation evidence"""
        evidence_path = os.path.join(self.metrics_path, 'evidence', category)
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}_{evidence['metric_type']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
        # Track in monitoring system
        self.monitor.track_validation(f"metrics_{evidence['metric_type']}")
