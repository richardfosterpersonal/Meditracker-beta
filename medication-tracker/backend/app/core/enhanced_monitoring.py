"""
Enhanced Monitoring System
Provides comprehensive monitoring for critical path and beta features
"""
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
import json
import os
from enum import Enum
import asyncio
from collections import defaultdict

from app.core.config import settings
from app.services.metrics_service import MetricsService
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult

class MonitoringLevel(str, Enum):
    """Monitoring levels from SINGLE_SOURCE_VALIDATION.md"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class MonitoringComponent(str, Enum):
    """Monitoring components from SINGLE_SOURCE_VALIDATION.md"""
    CRITICAL_PATH = "critical_path"
    BETA_FEATURE = "beta_feature"
    VALIDATION = "validation"
    SECURITY = "security"
    EVIDENCE = "evidence"

class EnhancedMonitoring:
    """
    Enhanced Monitoring System
    Provides comprehensive monitoring for all components
    """
    
    def __init__(self):
        self.metrics = MetricsService()
        self._monitor_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def monitor_component(
        self,
        component: MonitoringComponent,
        level: MonitoringLevel,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """Monitors component activity"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': component,
            'level': level,
            'status': 'pending'
        }
        
        try:
            # 1. Component monitoring
            await self._monitor_component_state(component, level, data, evidence)
            
            # 2. Critical path monitoring
            await self._monitor_critical_path(component, level, data, evidence)
            
            # 3. Beta feature monitoring
            if AppState.CURRENT_PHASE == "beta":
                await self._monitor_beta_features(component, level, data, evidence)
                
            # 4. Evidence collection
            await self._collect_monitoring_evidence(evidence)
            
            evidence['status'] = 'complete'
            await self._save_monitoring_evidence(evidence)
            
            # Track metrics
            await self.metrics.track_metric(
                metric_type='monitoring',
                name=f'{component}_monitoring',
                value={
                    'status': 'success',
                    'level': level
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
            await self._save_monitoring_evidence(evidence)
            
            # Track error
            await self.metrics.track_metric(
                metric_type='monitoring',
                name=f'{component}_monitoring_error',
                value={
                    'error': str(e),
                    'level': level
                },
                priority='critical'
            )
            
            return ValidationResult(
                is_valid=False,
                error=str(e),
                evidence=evidence
            )
            
    async def _monitor_component_state(
        self,
        component: MonitoringComponent,
        level: MonitoringLevel,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Monitors component state"""
        monitoring = {
            'type': 'component_state',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['monitoring'] = evidence.get('monitoring', [])
        evidence['monitoring'].append(monitoring)
        
        # Monitor based on component
        if component == MonitoringComponent.CRITICAL_PATH:
            await self._monitor_critical_path_state(level, data, monitoring)
        elif component == MonitoringComponent.BETA_FEATURE:
            await self._monitor_beta_feature_state(level, data, monitoring)
        elif component == MonitoringComponent.VALIDATION:
            await self._monitor_validation_state(level, data, monitoring)
        elif component == MonitoringComponent.SECURITY:
            await self._monitor_security_state(level, data, monitoring)
        elif component == MonitoringComponent.EVIDENCE:
            await self._monitor_evidence_state(level, data, monitoring)
            
        monitoring['status'] = 'complete'
        
    async def _monitor_critical_path(
        self,
        component: MonitoringComponent,
        level: MonitoringLevel,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Monitors critical path state"""
        monitoring = {
            'type': 'critical_path',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['monitoring'].append(monitoring)
        
        # Check critical path requirements
        if not AppState.CRITICAL_PATH_REQUIREMENTS.get(str(component), {}).get('monitoring_required', False):
            monitoring['status'] = 'failed'
            raise ValueError(f"Monitoring not required for {component}")
            
        monitoring['status'] = 'complete'
        
    async def _monitor_beta_features(
        self,
        component: MonitoringComponent,
        level: MonitoringLevel,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """Monitors beta feature state"""
        monitoring = {
            'type': 'beta_feature',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['monitoring'].append(monitoring)
        
        # Check beta requirements
        if not AppState.BETA_FEATURES.get(str(component), {}).get('monitoring_required', False):
            monitoring['status'] = 'failed'
            raise ValueError(f"Beta monitoring not required for {component}")
            
        monitoring['status'] = 'complete'
        
    async def _collect_monitoring_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Collects monitoring evidence"""
        async with self._buffer_lock:
            component = evidence['component']
            level = evidence['level']
            
            if component not in self._monitor_buffer:
                self._monitor_buffer[component] = {}
                
            if level not in self._monitor_buffer[component]:
                self._monitor_buffer[component][level] = []
                
            self._monitor_buffer[component][level].append(evidence)
            
            # Process if buffer gets too large
            if len(self._monitor_buffer[component][level]) >= settings.MONITORING_BUFFER_SIZE:
                await self._process_monitoring_buffer(component, level)
                
    async def _process_monitoring_buffer(
        self,
        component: Optional[MonitoringComponent] = None,
        level: Optional[MonitoringLevel] = None
    ) -> None:
        """Processes monitoring buffer"""
        async with self._buffer_lock:
            components = [component] if component else list(self._monitor_buffer.keys())
            
            for c in components:
                levels = [level] if level else list(self._monitor_buffer[c].keys())
                
                for l in levels:
                    if not self._monitor_buffer[c][l]:
                        continue
                        
                    evidence_path = os.path.join(
                        settings.MONITORING_EVIDENCE_PATH,
                        str(c),
                        str(l),
                        datetime.utcnow().strftime('%Y-%m-%d')
                    )
                    
                    if not os.path.exists(evidence_path):
                        os.makedirs(evidence_path)
                        
                    filename = f"{datetime.utcnow().isoformat()}.json"
                    filepath = os.path.join(evidence_path, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(self._monitor_buffer[c][l], f, indent=2)
                        
                    self._monitor_buffer[c][l] = []
                    
    async def _save_monitoring_evidence(
        self,
        evidence: Dict[str, Any]
    ) -> None:
        """Saves monitoring evidence"""
        evidence_path = os.path.join(
            settings.MONITORING_EVIDENCE_PATH,
            str(evidence['component']),
            str(evidence['level'])
        )
        
        if not os.path.exists(evidence_path):
            os.makedirs(evidence_path)
            
        filename = f"{evidence['timestamp']}.json"
        filepath = os.path.join(evidence_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)
            
    async def _monitor_critical_path_state(
        self,
        level: MonitoringLevel,
        data: Dict[str, Any],
        monitoring: Dict[str, Any]
    ) -> None:
        """Monitors critical path state"""
        # Add critical path monitoring logic
        pass
        
    async def _monitor_beta_feature_state(
        self,
        level: MonitoringLevel,
        data: Dict[str, Any],
        monitoring: Dict[str, Any]
    ) -> None:
        """Monitors beta feature state"""
        # Add beta feature monitoring logic
        pass
        
    async def _monitor_validation_state(
        self,
        level: MonitoringLevel,
        data: Dict[str, Any],
        monitoring: Dict[str, Any]
    ) -> None:
        """Monitors validation state"""
        # Add validation monitoring logic
        pass
        
    async def _monitor_security_state(
        self,
        level: MonitoringLevel,
        data: Dict[str, Any],
        monitoring: Dict[str, Any]
    ) -> None:
        """Monitors security state"""
        # Add security monitoring logic
        pass
        
    async def _monitor_evidence_state(
        self,
        level: MonitoringLevel,
        data: Dict[str, Any],
        monitoring: Dict[str, Any]
    ) -> None:
        """Monitors evidence state"""
        # Add evidence monitoring logic
        pass
