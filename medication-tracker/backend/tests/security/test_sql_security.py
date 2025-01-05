"""Tests for SQL security features."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.domain.medication.entities import Medication, Dosage, Schedule
from app.infrastructure.repositories.medication_repository import SQLMedicationRepository
from app.infrastructure.mappers.medication_mapper import MedicationMapper
from app.infrastructure.database.models import Medication

@pytest.fixture
def repository():
    """Create a repository with mocked database session."""
    session = Mock()
    mapper = MedicationMapper()
    return SQLMedicationRepository(session, mapper)

@pytest.fixture
def mock_medication_model():
    """Create a mock medication model."""
    model = Mock(spec=Medication)
    model.id = 1
    model.name = "Test Med"
    model.dosage = {
        "amount": 1,
        "unit": "mg",
        "frequency": "daily",
        "times_per_day": 1,
        "specific_times": ["09:00"]
    }
    model.schedule = {
        "start_date": datetime.now(),
        "end_date": None,
        "reminder_time": 30,
        "dose_times": ["09:00"],
        "timezone": "UTC"
    }
    model.user_id = 1
    return model

def test_secure_query_wrapper_success(repository, mock_medication_model):
    """Test that secure query wrapper allows valid queries."""
    # Arrange
    repository.session.query.return_value.filter.return_value.first.return_value = mock_medication_model
    medication_id = 1

    # Act
    result = repository.get_by_id(medication_id)

    # Assert
    assert result is not None
    assert result.name == "Test Med"
    repository.session.query.assert_called_once()

def test_secure_query_wrapper_sql_injection_attempt(repository):
    """Test that secure query wrapper blocks SQL injection attempts."""
    # Arrange
    malicious_id = "1; DROP TABLE medications; --"

    # Act & Assert
    with pytest.raises(ValueError) as exc_info:
        repository.get_by_id(malicious_id)
    assert "Invalid input" in str(exc_info.value)

def test_secure_query_wrapper_handles_db_error(repository):
    """Test that secure query wrapper properly handles database errors."""
    # Arrange
    repository.session.query.side_effect = Exception("Database error")
    
    # Act & Assert
    with pytest.raises(Exception) as exc_info:
        repository.get_by_id(1)
    assert "Database error" in str(exc_info.value)

def test_parameterized_query_protection(repository):
    """Test that parameterized queries protect against SQL injection."""
    # Arrange
    malicious_name = "test'; DROP TABLE medications; --"
    
    # Act & Assert
    with pytest.raises(ValueError) as exc_info:
        repository.get_by_name(malicious_name)
    assert "Invalid input" in str(exc_info.value)
