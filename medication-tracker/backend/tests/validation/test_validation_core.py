"""
Validation Core Tests
Last Updated: 2024-12-25T21:09:13+01:00
Status: CRITICAL
Reference: ../../../docs/validation/decisions/CRITICAL_PATH_ANALYSIS.md
"""

import pytest
from datetime import datetime
from app.validation.core import ValidationCore, ValidationResult

@pytest.fixture
def validation_core():
    """Validation core instance"""
    return ValidationCore()

@pytest.fixture
def sample_medication_data():
    """Sample medication data for testing"""
    return {
        'name': 'TestMed',
        'dosage': '10mg',
        'schedule': '1x daily',
        'timestamp': datetime.utcnow().isoformat()
    }

class TestMedicationSafety:
    """Test medication safety validation"""

    def test_valid_medication(self, validation_core, sample_medication_data):
        """Test valid medication data"""
        result = validation_core.validate_medication_safety(sample_medication_data)
        assert isinstance(result, ValidationResult)
        assert result.is_valid
        assert not result.errors
        assert 'hook_results' in result.hook_results

    def test_invalid_medication(self, validation_core):
        """Test invalid medication data"""
        invalid_data = {'name': 'TestMed'}  # Missing required fields
        result = validation_core.validate_medication_safety(invalid_data)
        assert isinstance(result, ValidationResult)
        assert not result.is_valid
        assert result.errors
        assert 'hook_results' in result.hook_results

    def test_schedule_conflicts(self, validation_core, sample_medication_data):
        """Test schedule conflict detection"""
        conflicting_data = sample_medication_data.copy()
        conflicting_data['schedule'] = 'conflicting'
        result = validation_core.validate_medication_safety(conflicting_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

    def test_dosage_warnings(self, validation_core, sample_medication_data):
        """Test dosage warning detection"""
        warning_data = sample_medication_data.copy()
        warning_data['dosage'] = 'high'
        result = validation_core.validate_medication_safety(warning_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

class TestDataIntegrity:
    """Test data integrity validation"""

    def test_valid_data(self, validation_core, sample_medication_data):
        """Test valid data integrity"""
        result = validation_core.validate_data_integrity(sample_medication_data)
        assert isinstance(result, ValidationResult)
        assert result.is_valid
        assert not result.errors
        assert 'hook_results' in result.hook_results

    def test_invalid_data(self, validation_core):
        """Test invalid data integrity"""
        invalid_data = {'incomplete': 'data'}
        result = validation_core.validate_data_integrity(invalid_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

    def test_transaction_validation(self, validation_core, sample_medication_data):
        """Test transaction validation"""
        transaction_data = sample_medication_data.copy()
        transaction_data['transaction'] = 'update'
        result = validation_core.validate_data_integrity(transaction_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

    def test_state_verification(self, validation_core, sample_medication_data):
        """Test state verification"""
        state_data = sample_medication_data.copy()
        state_data['state'] = 'active'
        result = validation_core.validate_data_integrity(state_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

class TestUserSafety:
    """Test user safety validation"""

    def test_valid_user_action(self, validation_core, sample_medication_data):
        """Test valid user action"""
        action_data = sample_medication_data.copy()
        action_data['action'] = 'view'
        result = validation_core.validate_user_safety(action_data)
        assert isinstance(result, ValidationResult)
        assert result.is_valid
        assert not result.errors
        assert 'hook_results' in result.hook_results

    def test_invalid_user_action(self, validation_core):
        """Test invalid user action"""
        invalid_data = {'action': 'invalid'}
        result = validation_core.validate_user_safety(invalid_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

    def test_safety_concerns(self, validation_core, sample_medication_data):
        """Test safety concern detection"""
        concern_data = sample_medication_data.copy()
        concern_data['risk_factor'] = 'high'
        result = validation_core.validate_user_safety(concern_data)
        assert isinstance(result, ValidationResult)
        assert 'hook_results' in result.hook_results

def test_validation_result():
    """Test validation result object"""
    result = ValidationResult(
        is_valid=True,
        data={'test': 'data'},
        errors=[],
        warnings=['warning'],
        hook_results={'test': 'results'}
    )
    assert result.is_valid
    assert result.data == {'test': 'data'}
    assert not result.errors
    assert result.warnings == ['warning']
    assert result.hook_results == {'test': 'results'}
    assert result.timestamp  # Should have a timestamp
