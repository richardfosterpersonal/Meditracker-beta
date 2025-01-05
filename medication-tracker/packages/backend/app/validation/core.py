"""
Core Validation (Single Source of Truth)
Last Updated: 2024-12-25T21:09:13+01:00
Status: CRITICAL
Reference: ../../../docs/validation/decisions/CRITICAL_PATH_ANALYSIS.md

This module provides core validation with mandatory hooks:
1. Medication Safety (HIGHEST PRIORITY)
2. Data Integrity (HIGH PRIORITY)
3. User Safety (HIGH PRIORITY)
"""

from datetime import datetime
from typing import Dict, Any, List, Optional, TypeVar, Generic
from pathlib import Path
from .hooks import (
    ValidationHook,
    GapAnalysisHook,
    CriticalPathHook,
    ImplementationHook,
    validate_feature_proposal
)
from .medication_safety import MedicationSafetyValidator
from .data import DataValidator
from .safety import SafetyChecker
from .reference import ReferenceManager

T = TypeVar('T')

class ValidationResult(Generic[T]):
    """Critical path validation result"""
    def __init__(
        self,
        is_valid: bool,
        data: Optional[T] = None,
        errors: Optional[List[str]] = None,
        warnings: Optional[List[str]] = None,
        hook_results: Optional[Dict[str, Any]] = None
    ):
        self._is_valid = is_valid
        self._data = data
        self._errors = errors or []
        self._warnings = warnings or []
        self._timestamp = datetime.utcnow().isoformat()
        self._hook_results = hook_results or {}

    @property
    def is_valid(self) -> bool:
        return self._is_valid

    @property
    def data(self) -> Optional[T]:
        return self._data

    @property
    def errors(self) -> List[str]:
        return self._errors.copy()

    @property
    def warnings(self) -> List[str]:
        return self._warnings.copy()

    @property
    def timestamp(self) -> str:
        return self._timestamp

    @property
    def hook_results(self) -> Dict[str, Any]:
        return self._hook_results.copy()

class ValidationCore:
    """Core validation with mandatory hooks"""

    def __init__(self):
        # Initialize hooks
        self.gap_analysis = GapAnalysisHook()
        self.critical_path = CriticalPathHook()
        self.implementation = ImplementationHook()
        
        # Initialize validators
        self.medication_validator = MedicationSafetyValidator()
        self.data_validator = DataValidator()
        self.safety_checker = SafetyChecker()
        self.reference_manager = ReferenceManager()
        
        # Set paths
        self.docs_path = Path(__file__).parent.parent.parent.parent / 'docs' / 'validation'

    def _run_hooks(
        self,
        feature_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run all mandatory hooks"""
        feature_proposal = {
            'type': feature_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        return validate_feature_proposal(feature_proposal)

    def validate_medication_safety(
        self,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate medication safety (HIGHEST PRIORITY)
        Runs through all mandatory hooks
        """
        # Run hooks first
        hook_results = self._run_hooks('medication_safety', data)
        if not hook_results['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=hook_results['errors'],
                warnings=hook_results['warnings'],
                hook_results=hook_results
            )

        # Run medication safety validation
        med_result = self.medication_validator.validate(data)
        if not med_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=med_result['errors'],
                warnings=med_result['warnings'],
                hook_results=hook_results
            )

        # Run reference validation
        ref_result = self.reference_manager.validate_references(data)
        if not ref_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=ref_result['errors'],
                warnings=ref_result['warnings'],
                hook_results=hook_results
            )

        return ValidationResult(
            is_valid=True,
            data=data,
            warnings=med_result['warnings'] + ref_result['warnings'],
            hook_results=hook_results
        )

    def validate_data_integrity(
        self,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate data integrity (HIGH PRIORITY)
        Runs through all mandatory hooks
        """
        # Run hooks first
        hook_results = self._run_hooks('data_integrity', data)
        if not hook_results['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=hook_results['errors'],
                warnings=hook_results['warnings'],
                hook_results=hook_results
            )

        # Run data validation
        data_result = self.data_validator.validate(data)
        if not data_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=data_result['errors'],
                warnings=data_result['warnings'],
                hook_results=hook_results
            )

        # Run reference validation
        ref_result = self.reference_manager.validate_references(data)
        if not ref_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=ref_result['errors'],
                warnings=ref_result['warnings'],
                hook_results=hook_results
            )

        return ValidationResult(
            is_valid=True,
            data=data,
            warnings=data_result['warnings'] + ref_result['warnings'],
            hook_results=hook_results
        )

    def validate_user_safety(
        self,
        data: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate user safety (HIGH PRIORITY)
        Runs through all mandatory hooks
        """
        # Run hooks first
        hook_results = self._run_hooks('user_safety', data)
        if not hook_results['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=hook_results['errors'],
                warnings=hook_results['warnings'],
                hook_results=hook_results
            )

        # Run safety validation
        safety_result = self.safety_checker.validate(data)
        if not safety_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=safety_result['errors'],
                warnings=safety_result['warnings'],
                hook_results=hook_results
            )

        # Run reference validation
        ref_result = self.reference_manager.validate_references(data)
        if not ref_result['is_valid']:
            return ValidationResult(
                is_valid=False,
                errors=ref_result['errors'],
                warnings=ref_result['warnings'],
                hook_results=hook_results
            )

        return ValidationResult(
            is_valid=True,
            data=data,
            warnings=safety_result['warnings'] + ref_result['warnings'],
            hook_results=hook_results
        )
