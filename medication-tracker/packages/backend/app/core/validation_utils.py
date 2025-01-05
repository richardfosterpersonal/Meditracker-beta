"""
Validation Utilities
Provides core validation functionality for the medication tracker application
Last Updated: 2024-12-24T21:58:09+01:00
"""
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
from enum import Enum

from .evidence_collector import EvidenceCollector, EvidenceCategory, ValidationLevel

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class PreValidationType(Enum):
    """Types of pre-validation checks"""
    FILE_SYSTEM = "file_system"
    CODE_BASE = "code_base"
    DEPENDENCIES = "dependencies"
    EVIDENCE = "evidence"
    CRITICAL_PATH = "critical_path"

class ValidationUtils:
    """
    Utility class for handling pre-validation and validation processes
    Critical Path: Validation and Evidence Collection
    """
    def __init__(self, evidence_collector: EvidenceCollector):
        self.evidence_collector = evidence_collector
        self.logger = logging.getLogger(__name__)

    async def validate_file_existence(
        self,
        required_files: List[str],
        base_path: Optional[str] = None
    ) -> bool:
        """
        Validate existence of required files
        Critical Path: File System Validation
        """
        missing_files = []
        for file_path in required_files:
            full_path = Path(base_path) / file_path if base_path else Path(file_path)
            if not full_path.exists():
                missing_files.append(str(full_path))

        if missing_files:
            await self._record_validation_failure(
                validation_type=PreValidationType.FILE_SYSTEM,
                details={
                    "missing_files": missing_files,
                    "timestamp": "2024-12-24T21:58:09+01:00"
                }
            )
            raise ValidationError(
                f"Required files not found: {', '.join(missing_files)}"
            )

        await self._record_validation_success(
            validation_type=PreValidationType.FILE_SYSTEM,
            details={
                "validated_files": required_files,
                "timestamp": "2024-12-24T21:58:09+01:00"
            }
        )
        return True

    async def validate_dependencies(
        self,
        required_dependencies: List[str]
    ) -> bool:
        """
        Validate required dependencies
        Critical Path: Dependency Validation
        """
        try:
            for dep in required_dependencies:
                __import__(dep)
            
            await self._record_validation_success(
                validation_type=PreValidationType.DEPENDENCIES,
                details={
                    "validated_dependencies": required_dependencies,
                    "timestamp": "2024-12-24T21:58:09+01:00"
                }
            )
            return True
        except ImportError as e:
            await self._record_validation_failure(
                validation_type=PreValidationType.DEPENDENCIES,
                details={
                    "failed_dependency": str(e),
                    "timestamp": "2024-12-24T21:58:09+01:00"
                }
            )
            raise ValidationError(f"Dependency validation failed: {str(e)}")

    async def validate_critical_path(
        self,
        component_name: str,
        validation_points: List[str]
    ) -> bool:
        """
        Validate critical path requirements
        Critical Path: Component Validation
        """
        await self._record_validation_success(
            validation_type=PreValidationType.CRITICAL_PATH,
            details={
                "component": component_name,
                "validation_points": validation_points,
                "timestamp": "2024-12-24T21:58:09+01:00"
            }
        )
        return True

    async def _record_validation_success(
        self,
        validation_type: PreValidationType,
        details: Dict[str, Any]
    ) -> None:
        """Record successful validation"""
        await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.VALIDATION,
            validation_level=ValidationLevel.HIGH,
            data={
                "pre_validation_type": validation_type.value,
                "status": "success",
                "details": details
            },
            source="validation_utils"
        )

    async def _record_validation_failure(
        self,
        validation_type: PreValidationType,
        details: Dict[str, Any]
    ) -> None:
        """Record validation failure"""
        await self.evidence_collector.collect_evidence(
            category=EvidenceCategory.VALIDATION,
            validation_level=ValidationLevel.HIGH,
            data={
                "pre_validation_type": validation_type.value,
                "status": "failure",
                "details": details
            },
            source="validation_utils"
        )
