"""
Medication Safety Validation Tests
Critical Path: VALIDATION-TESTS
Last Updated: 2025-01-02T14:13:50+01:00
"""

import pytest
from datetime import datetime
from typing import Dict

from ..app.core.unified_validation_framework import UnifiedValidationFramework
from ..app.validation.safety import SafetyValidation
from ..app.models.validation import ValidationStatus, ValidationPriority

@pytest.fixture
def validator():
    """Create a validator instance for testing"""
    return SafetyValidation()

@pytest.fixture
def test_medication():
    """Create test medication data"""
    return {
        "id": "MED-TEST-1",
        "name": "Test Medication",
        "dosage": "10mg",
        "frequency": "daily",
        "max_daily_dose": "20mg",
        "min_interval_hours": 24,
        "warnings": ["Do not take with food"],
        "contraindications": ["High blood pressure"]
    }

@pytest.fixture
def test_patient_history():
    """Create test patient history data"""
    return {
        "id": "PAT-TEST-1",
        "conditions": ["Diabetes"],
        "allergies": ["Penicillin"],
        "current_medications": [
            {
                "id": "MED-CURRENT-1",
                "name": "Current Med",
                "dosage": "5mg",
                "frequency": "daily"
            }
        ]
    }

@pytest.fixture
def test_schedule():
    """Create test schedule data"""
    return {
        "id": "SCH-TEST-1",
        "medication_id": "MED-TEST-1",
        "times": ["09:00", "21:00"],
        "start_date": datetime.utcnow().isoformat(),
        "end_date": None,
        "days": ["Monday", "Wednesday", "Friday"]
    }

def test_medication_validation(validator, test_medication):
    """Test basic medication validation"""
    result = validator.validate_medication(test_medication)
    assert isinstance(result, dict)
    assert "valid" in result
    assert "issues" in result
    assert "warnings" in result
    assert "timestamp" in result

def test_medication_with_history(validator, test_medication, test_patient_history):
    """Test medication validation with patient history"""
    result = validator.validate_medication(
        test_medication,
        patient_history=test_patient_history
    )
    assert isinstance(result, dict)
    assert "valid" in result
    assert "issues" in result
    assert "warnings" in result
    assert "patterns" in result

def test_medication_with_schedule(
    validator,
    test_medication,
    test_patient_history,
    test_schedule
):
    """Test medication validation with schedule"""
    result = validator.validate_medication(
        test_medication,
        patient_history=test_patient_history,
        schedule=test_schedule
    )
    assert isinstance(result, dict)
    assert "valid" in result
    assert "issues" in result
    assert "warnings" in result
    assert "patterns" in result

def test_safety_history(validator, test_medication):
    """Test retrieving safety validation history"""
    # First run a validation
    validator.validate_medication(test_medication)
    
    # Get history
    history = validator.get_safety_history(
        medication_id=test_medication["id"]
    )
    assert isinstance(history, list)
    assert len(history) > 0
    
    # Check history entry
    entry = history[0]
    assert "id" in entry
    assert "timestamp" in entry
    assert "patterns" in entry

def test_invalid_medication(validator):
    """Test validation with invalid medication data"""
    invalid_medication = {
        "id": "MED-INVALID-1",
        "name": "Invalid Med",
        "dosage": "INVALID",
        "frequency": "INVALID"
    }
    
    result = validator.validate_medication(invalid_medication)
    assert isinstance(result, dict)
    assert not result["valid"]
    assert len(result["issues"]) > 0

def test_safety_patterns(validator, test_medication):
    """Test safety validation patterns"""
    result = validator.validate_medication(test_medication)
    assert "patterns" in result
    patterns = result["patterns"]
    
    # Check core patterns exist
    pattern_ids = [p.get("id") for p in patterns]
    assert "dosage_safety" in pattern_ids
    assert "interaction_safety" in pattern_ids
    assert "schedule_safety" in pattern_ids
