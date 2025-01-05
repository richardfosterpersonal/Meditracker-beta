"""Tests for the LiabilityProtectionService."""

import pytest
import logging
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.services.liability_protection_service import LiabilityProtectionService

@pytest.fixture
def liability_service():
    """Create a LiabilityProtectionService instance for testing."""
    return LiabilityProtectionService()

@pytest.fixture
def sample_medication():
    """Create a sample medication dictionary for testing."""
    return {
        'name': 'Test Medication',
        'dosage': '10mg',
        'frequency': 'daily',
        'doses_per_day': 2,
        'is_custom': False,
        'with_food': True,
        'avoid_alcohol': True
    }

class TestLiabilityProtectionService:
    """Test cases for LiabilityProtectionService."""

    def test_validate_medication_entry_basic(self, liability_service, sample_medication):
        """Test basic medication validation."""
        result = liability_service.validate_medication_entry(sample_medication)
        
        assert result['requires_verification'] is False
        assert len(result['warnings']) == 0
        assert len(result['disclaimers']) == 1
        assert result['confirmation_required'] is False
        assert liability_service.required_disclaimers['general'] in result['disclaimers']

    def test_validate_medication_entry_elderly(self, liability_service, sample_medication):
        """Test medication validation for elderly patients."""
        result = liability_service.validate_medication_entry(sample_medication, user_age=65)
        
        assert len(result['warnings']) == 1
        assert "appropriate for elderly patients" in result['warnings'][0]

    def test_validate_medication_entry_minor(self, liability_service, sample_medication):
        """Test medication validation for minors."""
        result = liability_service.validate_medication_entry(sample_medication, user_age=16)
        
        assert result['requires_verification'] is True
        assert len(result['warnings']) == 1
        assert "appropriate for minors" in result['warnings'][0]

    def test_validate_custom_medication(self, liability_service, sample_medication):
        """Test validation for custom medications."""
        sample_medication['is_custom'] = True
        result = liability_service.validate_medication_entry(sample_medication)
        
        assert result['requires_verification'] is True
        assert result['confirmation_required'] is True
        assert len(result['disclaimers']) == 2
        assert liability_service.required_disclaimers['custom_medication'] in result['disclaimers']

    def test_validate_high_frequency_medication(self, liability_service, sample_medication):
        """Test validation for medications with high daily doses."""
        sample_medication['doses_per_day'] = 5  # Above threshold
        result = liability_service.validate_medication_entry(sample_medication)
        
        assert result['confirmation_required'] is True
        assert len(result['warnings']) == 1
        assert "Multiple daily doses detected" in result['warnings'][0]

    def test_generate_safety_acknowledgment(self, liability_service, sample_medication):
        """Test safety acknowledgment generation."""
        safety_measures = {
            'disclaimers': [
                liability_service.required_disclaimers['general'],
                liability_service.required_disclaimers['custom_medication']
            ],
            'warnings': ['Test warning']
        }
        
        result = liability_service.generate_safety_acknowledgment(sample_medication, safety_measures)
        
        assert sample_medication['name'] in result
        assert sample_medication['dosage'] in result
        assert sample_medication['frequency'] in result
        assert safety_measures['disclaimers'][0] in result
        assert safety_measures['disclaimers'][1] in result
        assert safety_measures['warnings'][0] in result
        assert "I confirm that I have reviewed" in result

    def test_log_safety_verification_success(self, liability_service):
        """Test successful safety verification logging."""
        medication_id = 1
        user_id = 1
        safety_measures = {'warnings': [], 'disclaimers': []}
        
        with patch('app.services.liability_protection_service.logger') as mock_logger:
            liability_service.log_safety_verification(medication_id, user_id, safety_measures)
            mock_logger.info.assert_called_once()
            assert str(medication_id) in mock_logger.info.call_args[0][0]

    def test_log_safety_verification_error(self, liability_service):
        """Test error handling in safety verification logging."""
        medication_id = 1
        user_id = 1
        safety_measures = None  # This will cause an error
        
        with patch('app.services.liability_protection_service.logger') as mock_logger:
            liability_service.log_safety_verification(medication_id, user_id, safety_measures)
            mock_logger.error.assert_called_once()
            assert "Error logging safety verification" in mock_logger.error.call_args[0][0]

    def test_get_simplified_instructions_basic(self, liability_service, sample_medication):
        """Test basic simplified instructions generation."""
        result = liability_service.get_simplified_instructions(sample_medication)
        
        assert "Take 10mg daily" in result
        assert "Take with food" in result
        assert "Do not drink alcohol" in result

    def test_get_simplified_instructions_elderly(self, liability_service, sample_medication):
        """Test simplified instructions for elderly patients."""
        result = liability_service.get_simplified_instructions(sample_medication, user_age=65)
        
        assert "Take 10mg daily" in result
        assert "If you feel dizzy" in result

    def test_get_simplified_instructions_minor(self, liability_service, sample_medication):
        """Test simplified instructions for minors."""
        result = liability_service.get_simplified_instructions(sample_medication, user_age=16)
        
        assert "Take 10mg daily" in result
        assert "responsible adult" in result
