"""
Validation Orchestrator
Manages application-wide validation processes and critical path adherence
Last Updated: 2024-12-24T22:00:52+01:00
"""
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
import asyncio
from enum import Enum

from .evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)
from .validation_utils import (
    ValidationUtils,
    PreValidationType,
    ValidationError
)

class CriticalPathComponent(Enum):
    """Core components in the application's critical path"""
    MEDICATION_TRACKING = "medication_tracking"
    USER_MANAGEMENT = "user_management"
    MONITORING = "monitoring"
    EVIDENCE_COLLECTION = "evidence_collection"
    METRICS = "metrics"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    PERSISTENCE = "persistence"

class ValidationPhase(Enum):
    """Validation phases in the application lifecycle"""
    PRE_INITIALIZATION = "pre_initialization"
    RUNTIME = "runtime"
    POST_OPERATION = "post_operation"
    SHUTDOWN = "shutdown"

class ValidationStatus(Enum):
    """Status of validation processes"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ValidationOrchestrator:
    """
    Orchestrates validation processes across the application
    Maintains single source of truth for validation state
    """
    def __init__(
        self,
        evidence_collector: EvidenceCollector,
        validation_dir: str = "/validation"
    ):
        self.evidence_collector = evidence_collector
        self.validation_utils = ValidationUtils(evidence_collector)
        self.validation_dir = Path(validation_dir)
        self.logger = logging.getLogger(__name__)
        
        # Validation state storage
        self.validation_state: Dict[str, Dict[str, Any]] = {}
        self.critical_path_state: Dict[str, Dict[str, Any]] = {}
        
        # Create validation directory
        self.validation_dir.mkdir(parents=True, exist_ok=True)

    async def initialize_validation(self) -> None:
        """
        Initialize validation framework
        Critical Path: Framework Initialization
        """
        await self._record_validation_event(
            phase=ValidationPhase.PRE_INITIALIZATION,
            status=ValidationStatus.IN_PROGRESS,
            details={
                "timestamp": "2024-12-24T22:00:52+01:00",
                "action": "framework_initialization"
            }
        )
        
        # Initialize critical path components
        for component in CriticalPathComponent:
            self.critical_path_state[component.value] = {
                "status": ValidationStatus.PENDING.value,
                "last_validated": None,
                "validation_chain": []
            }
        
        await self._record_validation_event(
            phase=ValidationPhase.PRE_INITIALIZATION,
            status=ValidationStatus.COMPLETED,
            details={
                "timestamp": "2024-12-24T22:00:52+01:00",
                "action": "framework_initialization_complete"
            }
        )

    async def validate_critical_path_component(
        self,
        component: CriticalPathComponent,
        validation_data: Dict[str, Any]
    ) -> bool:
        """
        Validate a critical path component
        Critical Path: Component Validation
        """
        await self._record_validation_event(
            phase=ValidationPhase.RUNTIME,
            status=ValidationStatus.IN_PROGRESS,
            details={
                "timestamp": "2024-12-24T22:00:52+01:00",
                "component": component.value,
                "action": "component_validation"
            }
        )
        
        try:
            # Validate component requirements
            await self.validation_utils.validate_critical_path(
                component.value,
                validation_data.get("validation_points", [])
            )
            
            # Update component state
            self.critical_path_state[component.value].update({
                "status": ValidationStatus.COMPLETED.value,
                "last_validated": "2024-12-24T22:00:52+01:00",
                "validation_chain": validation_data.get("validation_chain", [])
            })
            
            await self._record_validation_event(
                phase=ValidationPhase.RUNTIME,
                status=ValidationStatus.COMPLETED,
                details={
                    "timestamp": "2024-12-24T22:00:52+01:00",
                    "component": component.value,
                    "action": "component_validation_complete"
                }
            )
            return True
            
        except ValidationError as e:
            await self._record_validation_event(
                phase=ValidationPhase.RUNTIME,
                status=ValidationStatus.FAILED,
                details={
                    "timestamp": "2024-12-24T22:00:52+01:00",
                    "component": component.value,
                    "error": str(e),
                    "action": "component_validation_failed"
                }
            )
            raise

    async def get_validation_state(
        self,
        component: Optional[CriticalPathComponent] = None
    ) -> Dict[str, Any]:
        """
        Get current validation state
        Critical Path: State Management
        """
        if component:
            return self.critical_path_state.get(component.value, {})
        return self.critical_path_state

    async def validate_application_state(self) -> bool:
        """
        Validate entire application state
        Critical Path: Application Validation
        """
        await self._record_validation_event(
            phase=ValidationPhase.RUNTIME,
            status=ValidationStatus.IN_PROGRESS,
            details={
                "timestamp": "2024-12-24T22:00:52+01:00",
                "action": "application_validation"
            }
        )
        
        # Check all critical path components
        incomplete_components = [
            component.value
            for component in CriticalPathComponent
            if self.critical_path_state[component.value]["status"] != ValidationStatus.COMPLETED.value
        ]
        
        if incomplete_components:
            await self._record_validation_event(
                phase=ValidationPhase.RUNTIME,
                status=ValidationStatus.FAILED,
                details={
                    "timestamp": "2024-12-24T22:00:52+01:00",
                    "incomplete_components": incomplete_components,
                    "action": "application_validation_failed"
                }
            )
            raise ValidationError(
                f"Incomplete critical path components: {', '.join(incomplete_components)}"
            )
        
        await self._record_validation_event(
            phase=ValidationPhase.RUNTIME,
            status=ValidationStatus.COMPLETED,
            details={
                "timestamp": "2024-12-24T22:00:52+01:00",
                "action": "application_validation_complete"
            }
        )
        return True

    async def _record_validation_event(
        self,
        phase: ValidationPhase,
        status: ValidationStatus,
        details: Dict[str, Any]
    ) -> None:
        """Record a validation event with evidence"""
        await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.VALIDATION,
            validation_level=ValidationLevel.HIGH,
            data={
                "phase": phase.value,
                "status": status.value,
                "details": details
            },
            source="validation_orchestrator"
        )
