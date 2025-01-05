"""
Test Module for Medication Safety Validation
Compliant with SINGLE_SOURCE_VALIDATION.md
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from app.validation.medication_safety import MedicationSafetyValidator
from app.core.config import settings

@pytest.fixture
def validator():
    """Create a validator instance for testing"""
    return MedicationSafetyValidator()

def test_drug_interaction_validation(validator):
    """Test VALIDATION-MED-001: Drug interaction validation"""
    result = validator.validate_drug_interaction('aspirin', 'warfarin')
    assert result['status'] == 'success'
    assert result['evidence']['validation_id'] == 'VALIDATION-MED-001'
    assert result['evidence']['validation_status'] == 'complete'

def test_safety_alerts_validation(validator):
    """Test VALIDATION-MED-002: Safety alerts validation"""
    alert_config = {
        'alert_level': 'high',
        'notification_method': 'push',
        'escalation_path': 'immediate'
    }
    result = validator.validate_safety_alerts(alert_config)
    assert result['status'] == 'success'
    assert result['evidence']['validation_id'] == 'VALIDATION-MED-002'
    assert result['evidence']['validation_status'] == 'complete'

def test_emergency_protocol_validation(validator):
    """Test VALIDATION-MED-003: Emergency protocol validation"""
    result = validator.validate_emergency_protocol('EMERGENCY-001')
    assert result['status'] == 'success'
    assert result['evidence']['validation_id'] == 'VALIDATION-MED-003'
    assert result['evidence']['validation_status'] == 'complete'

def test_evidence_collection(validator):
    """Test validation evidence collection"""
    with patch('builtins.open', MagicMock()) as mock_open:
        validator.validate_drug_interaction('med_a', 'med_b')
        mock_open.assert_called_once()
        args, kwargs = mock_open.call_args
        assert 'VALIDATION-MED-001' in args[0]

def test_validation_disabled(monkeypatch):
    """Test behavior when validation is disabled"""
    monkeypatch.setattr(settings, 'VALIDATION_ENABLED', False)
    validator = MedicationSafetyValidator()
    with patch('builtins.open', MagicMock()) as mock_open:
        validator.validate_drug_interaction('med_a', 'med_b')
        mock_open.assert_not_called()

def test_validation_error_handling(validator):
    """Test validation error handling"""
    with patch.object(validator, '_save_evidence', side_effect=Exception('Test error')):
        result = validator.validate_drug_interaction('med_a', 'med_b')
        assert result['status'] == 'error'
        assert 'Test error' in result['evidence']['error']
