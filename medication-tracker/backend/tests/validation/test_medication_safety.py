"""
Medication Safety Validation Tests
Last Updated: 2024-12-25T21:12:48+01:00
Status: CRITICAL
Reference: ../../../docs/validation/decisions/CRITICAL_PATH_ANALYSIS.md
"""
import pytest
from datetime import datetime, timedelta
from app.validation.medication_safety import MedicationSafetyValidator

@pytest.fixture
def validator():
    return MedicationSafetyValidator()

@pytest.fixture
def sample_medications():
    return [
        {'name': 'aspirin', 'dosage': {'amount': 500, 'unit': 'mg'}},
        {'name': 'warfarin', 'dosage': {'amount': 5, 'unit': 'mg'}},
    ]

@pytest.fixture
def sample_schedule():
    return {
        'frequency': 2,
        'interval_hours': 12,
        'medication_name': 'test_med'
    }

@pytest.fixture
def sample_patient_data():
    return {
        'age': 45,
        'weight': 70,
        'conditions': ['hypertension']
    }

class TestDrugInteractions:
    def test_severe_interaction(self, validator, sample_medications):
        """Test detection of severe drug interactions"""
        result = validator.validate_drug_interactions(sample_medications)
        assert result['status'] == 'error'
        assert any('SEVERE INTERACTION' in error for error in result['errors'])
        assert result['evidence']['validation_status'] == 'complete'

    def test_safe_medications(self, validator):
        """Test safe medication combinations"""
        safe_meds = [
            {'name': 'vitamin_c', 'dosage': {'amount': 500, 'unit': 'mg'}},
            {'name': 'vitamin_d', 'dosage': {'amount': 1000, 'unit': 'iu'}},
        ]
        result = validator.validate_drug_interactions(safe_meds)
        assert result['status'] == 'success'
        assert not result['errors']

class TestDosageSafety:
    def test_unsafe_dosage(self, validator):
        """Test detection of unsafe dosage"""
        unsafe_dosage = {'amount': 5000, 'unit': 'mg'}
        result = validator.validate_dosage_safety(unsafe_dosage)
        assert result['status'] == 'error'
        assert any('UNSAFE DOSAGE' in error for error in result['errors'])

    def test_safe_dosage(self, validator):
        """Test safe dosage validation"""
        safe_dosage = {'amount': 500, 'unit': 'mg'}
        result = validator.validate_dosage_safety(safe_dosage)
        assert result['status'] == 'success'
        assert not result['errors']

    def test_patient_factors(self, validator):
        """Test patient-specific dosage factors"""
        dosage = {'amount': 500, 'unit': 'mg'}
        patient_data = {
            'age': 75,
            'weight': 45,
            'conditions': ['kidney_disease']
        }
        result = validator.validate_dosage_safety(dosage, patient_data)
        assert result['status'] == 'error'
        assert any('kidney disease' in error.lower() for error in result['errors'])

class TestScheduleSafety:
    def test_schedule_frequency(self, validator):
        """Test schedule frequency validation"""
        unsafe_schedule = {
            'frequency': 6,  # Exceeds max_daily_doses
            'interval_hours': 4
        }
        result = validator.validate_schedule_safety(unsafe_schedule)
        assert result['status'] == 'error'
        assert any('UNSAFE SCHEDULE' in error for error in result['errors'])

    def test_schedule_interval(self, validator):
        """Test schedule interval validation"""
        unsafe_schedule = {
            'frequency': 2,
            'interval_hours': 2  # Less than min_interval_hours
        }
        result = validator.validate_schedule_safety(unsafe_schedule)
        assert result['status'] == 'error'
        assert any('UNSAFE SCHEDULE' in error for error in result['errors'])

    def test_schedule_conflicts(self, validator, sample_schedule):
        """Test schedule conflict detection"""
        existing_schedules = [
            {
                'frequency': 2,
                'interval_hours': 12,
                'medication_name': 'existing_med',
                'start_time': datetime.now()
            }
        ]
        result = validator.validate_schedule_safety(sample_schedule, existing_schedules)
        assert result['status'] == 'error'
        assert any('Schedule conflict' in error for error in result['errors'])

class TestEmergencyProtocol:
    def test_invalid_protocol(self, validator):
        """Test invalid emergency protocol"""
        result = validator.validate_emergency_protocol('INVALID_PROTOCOL')
        assert result['status'] == 'error'
        assert any('not found' in error.lower() for error in result['errors'])

    def test_inactive_protocol(self, validator):
        """Test inactive emergency protocol"""
        result = validator.validate_emergency_protocol('PROTOCOL002')
        assert result['status'] == 'error'
        assert any('not active' in error.lower() for error in result['errors'])

    def test_valid_protocol(self, validator):
        """Test valid emergency protocol"""
        result = validator.validate_emergency_protocol('PROTOCOL001')
        assert result['status'] == 'success'
        assert not result['errors']
        assert any('monthly review' in warning.lower() for warning in result['warnings'])

class TestComprehensiveValidation:
    def test_comprehensive_validation(self, validator, sample_medications, sample_schedule, sample_patient_data):
        """Test comprehensive validation with all components"""
        data = {
            'medications': sample_medications,
            'dosage': {'amount': 500, 'unit': 'mg'},
            'schedule': sample_schedule,
            'patient_data': sample_patient_data,
            'emergency_protocol': 'PROTOCOL001'
        }
        result = validator.validate(data)
        
        # Should fail due to severe interaction in sample_medications
        assert not result['is_valid']
        assert result['errors']
        assert len(result['evidence']) > 0

    def test_validation_evidence(self, validator, sample_medications):
        """Test validation evidence generation"""
        result = validator.validate_drug_interactions(sample_medications)
        evidence = result['evidence']
        
        assert evidence['timestamp']
        assert evidence['validation_id'] == 'VALIDATION-MED-001'
        assert evidence['validation_status'] == 'complete'
