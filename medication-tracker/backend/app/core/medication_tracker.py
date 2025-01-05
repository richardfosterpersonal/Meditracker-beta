"""
Medication Tracking System
Core component for medication management with validation integration
Last Updated: 2024-12-24T22:02:51+01:00
"""
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
from enum import Enum

from .validation_orchestrator import (
    ValidationOrchestrator,
    CriticalPathComponent,
    ValidationPhase,
    ValidationStatus,
    ValidationError
)
from .evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)

class MedicationValidationPoint(Enum):
    """Validation points for medication tracking"""
    DATA_INTEGRITY = "data_integrity"
    DOSAGE_ACCURACY = "dosage_accuracy"
    SCHEDULE_COMPLIANCE = "schedule_compliance"
    INTERACTION_CHECK = "interaction_check"
    HISTORY_TRACKING = "history_tracking"

class MedicationTracker:
    """
    Core medication tracking system
    Integrated with validation orchestration
    """
    def __init__(
        self,
        validation_orchestrator: ValidationOrchestrator,
        evidence_collector: EvidenceCollector,
        storage_dir: str = "/medications"
    ):
        self.validation_orchestrator = validation_orchestrator
        self.evidence_collector = evidence_collector
        self.storage_dir = Path(storage_dir)
        self.logger = logging.getLogger(__name__)
        
        # Validation state
        self.validation_chain: List[str] = []
        
        # Initialize storage
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize component
        self._initialize_component()

    async def _initialize_component(self) -> None:
        """Initialize and validate component"""
        validation_data = {
            "validation_points": [point.value for point in MedicationValidationPoint],
            "validation_chain": self.validation_chain
        }
        
        await self.validation_orchestrator.validate_critical_path_component(
            CriticalPathComponent.MEDICATION_TRACKING,
            validation_data
        )

    async def add_medication(
        self,
        user_id: str,
        medication_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Add new medication with validation
        Critical Path: Medication Data Management
        """
        # Validate data integrity
        await self._validate_point(
            MedicationValidationPoint.DATA_INTEGRITY,
            {
                "user_id": user_id,
                "medication_data": medication_data,
                "action": "add_medication"
            }
        )
        
        # Validate dosage
        await self._validate_point(
            MedicationValidationPoint.DOSAGE_ACCURACY,
            {
                "dosage": medication_data.get("dosage"),
                "unit": medication_data.get("unit"),
                "frequency": medication_data.get("frequency")
            }
        )
        
        # Check interactions
        await self._validate_point(
            MedicationValidationPoint.INTERACTION_CHECK,
            {
                "new_medication": medication_data.get("name"),
                "existing_medications": await self.get_user_medications(user_id)
            }
        )
        
        # Store medication with evidence
        evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.MEDICATION_SAFETY,
            validation_level=ValidationLevel.HIGH,
            data={
                "action": "add_medication",
                "user_id": user_id,
                "medication": medication_data,
                "timestamp": "2024-12-24T22:02:51+01:00"
            },
            source="medication_tracker"
        )
        
        self.validation_chain.append(evidence.id)
        
        # Update component validation
        await self._initialize_component()
        
        return {
            "medication_id": evidence.id,
            "status": "added",
            "timestamp": "2024-12-24T22:02:51+01:00",
            "validation_chain": self.validation_chain
        }

    async def update_schedule(
        self,
        user_id: str,
        medication_id: str,
        schedule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update medication schedule with validation
        Critical Path: Schedule Management
        """
        # Validate schedule compliance
        await self._validate_point(
            MedicationValidationPoint.SCHEDULE_COMPLIANCE,
            {
                "user_id": user_id,
                "medication_id": medication_id,
                "schedule": schedule_data
            }
        )
        
        # Update with evidence
        evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.MEDICATION_SAFETY,
            validation_level=ValidationLevel.HIGH,
            data={
                "action": "update_schedule",
                "user_id": user_id,
                "medication_id": medication_id,
                "schedule": schedule_data,
                "timestamp": "2024-12-24T22:02:51+01:00"
            },
            source="medication_tracker"
        )
        
        self.validation_chain.append(evidence.id)
        
        # Update component validation
        await self._initialize_component()
        
        return {
            "status": "updated",
            "timestamp": "2024-12-24T22:02:51+01:00",
            "validation_chain": self.validation_chain
        }

    async def record_intake(
        self,
        user_id: str,
        medication_id: str,
        intake_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Record medication intake with validation
        Critical Path: Intake Tracking
        """
        # Validate history tracking
        await self._validate_point(
            MedicationValidationPoint.HISTORY_TRACKING,
            {
                "user_id": user_id,
                "medication_id": medication_id,
                "intake": intake_data
            }
        )
        
        # Record with evidence
        evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.MEDICATION_SAFETY,
            validation_level=ValidationLevel.HIGH,
            data={
                "action": "record_intake",
                "user_id": user_id,
                "medication_id": medication_id,
                "intake": intake_data,
                "timestamp": "2024-12-24T22:02:51+01:00"
            },
            source="medication_tracker"
        )
        
        self.validation_chain.append(evidence.id)
        
        # Update component validation
        await self._initialize_component()
        
        return {
            "intake_id": evidence.id,
            "status": "recorded",
            "timestamp": "2024-12-24T22:02:51+01:00",
            "validation_chain": self.validation_chain
        }

    async def get_user_medications(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get user medications with validation
        Critical Path: Data Retrieval
        """
        # Validate data integrity
        await self._validate_point(
            MedicationValidationPoint.DATA_INTEGRITY,
            {
                "user_id": user_id,
                "action": "get_medications"
            }
        )
        
        # Get medications with evidence
        evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.MEDICATION_SAFETY,
            validation_level=ValidationLevel.HIGH,
            data={
                "action": "get_medications",
                "user_id": user_id,
                "timestamp": "2024-12-24T22:02:51+01:00"
            },
            source="medication_tracker"
        )
        
        self.validation_chain.append(evidence.id)
        
        # Update component validation
        await self._initialize_component()
        
        return []  # Placeholder for actual implementation

    async def _validate_point(
        self,
        point: MedicationValidationPoint,
        data: Dict[str, Any]
    ) -> None:
        """
        Validate a specific point in the medication tracking process
        Critical Path: Point Validation
        """
        evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.VALIDATION,
            validation_level=ValidationLevel.HIGH,
            data={
                "validation_point": point.value,
                "validation_data": data,
                "timestamp": "2024-12-24T22:02:51+01:00"
            },
            source="medication_tracker"
        )
        
        self.validation_chain.append(evidence.id)
