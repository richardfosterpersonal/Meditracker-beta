"""Tests for the interaction service."""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch
import requests
from fastapi import HTTPException

from app.services.interaction_service import InteractionService
from app.domain.medication.entities import Medication, Dosage, Schedule

@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return Mock()

@pytest.fixture
def interaction_service(mock_db_session):
    """Create an interaction service instance with mocked dependencies."""
    return InteractionService(mock_db_session)

@pytest.fixture
def sample_schedule():
    """Create a sample schedule for testing."""
    return Schedule(
        start_date=datetime.now(),
        end_date=None,
        reminder_time=30,
        dose_times=["09:00"],
        timezone="UTC"
    )

@pytest.fixture
def sample_dosage():
    """Create a sample dosage for testing."""
    return Dosage(
        amount="1",
        unit="tablet",
        frequency="daily",
        times_per_day=1,
        specific_times=["09:00"]
    )

def test_check_interactions_success(interaction_service, sample_dosage, sample_schedule):
    """Test successful interaction check."""
    # Arrange
    medication_ids = [1, 2]
    user_id = 1
    mock_medications = [
        Medication(name="Med1", dosage=sample_dosage, schedule=sample_schedule, user_id=user_id),
        Medication(name="Med2", dosage=sample_dosage, schedule=sample_schedule, user_id=user_id)
    ]
    mock_medications[0].id = 1
    mock_medications[1].id = 2
    
    interaction_service.medication_repository.get_by_id.side_effect = mock_medications
    
    with patch.object(interaction_service.session, 'post') as mock_post:
        mock_post.return_value.json.return_value = {
            "interactions": [
                {"severity": "moderate", "description": "Test interaction"}
            ]
        }
        mock_post.return_value.raise_for_status = Mock()

        # Act
        result = interaction_service.check_interactions(medication_ids, user_id)

        # Assert
        assert "interactions" in result
        assert len(result["interactions"]) == 1
        mock_post.assert_called_once()

def test_check_interactions_unauthorized(interaction_service, sample_dosage, sample_schedule):
    """Test unauthorized access to medications."""
    # Arrange
    medication_ids = [1]
    user_id = 1
    other_user_id = 2
    mock_medication = Medication(name="Med1", dosage=sample_dosage, schedule=sample_schedule, user_id=other_user_id)
    mock_medication.id = 1
    
    interaction_service.medication_repository.get_by_id.return_value = mock_medication

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        interaction_service.check_interactions(medication_ids, user_id)
    assert exc_info.value.status_code == 403

def test_check_interactions_invalid_input(interaction_service):
    """Test invalid input handling."""
    # Arrange
    invalid_medication_ids = "not a list"
    user_id = 1

    # Act & Assert
    with pytest.raises(ValueError) as exc_info:
        interaction_service.check_interactions(invalid_medication_ids, user_id)
    assert "medication_ids must be a list" in str(exc_info.value)

def test_check_interactions_api_error(interaction_service, sample_dosage, sample_schedule):
    """Test handling of API errors."""
    # Arrange
    medication_ids = [1]
    user_id = 1
    mock_medication = Medication(name="Med1", dosage=sample_dosage, schedule=sample_schedule, user_id=user_id)
    mock_medication.id = 1
    
    interaction_service.medication_repository.get_by_id.return_value = mock_medication
    
    with patch.object(interaction_service.session, 'post') as mock_post:
        mock_post.side_effect = requests.RequestException("API Error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            interaction_service.check_interactions(medication_ids, user_id)
        assert exc_info.value.status_code == 503

def test_check_interactions_invalid_response(interaction_service, sample_dosage, sample_schedule):
    """Test handling of invalid API responses."""
    # Arrange
    medication_ids = [1]
    user_id = 1
    mock_medication = Medication(name="Med1", dosage=sample_dosage, schedule=sample_schedule, user_id=user_id)
    mock_medication.id = 1
    
    interaction_service.medication_repository.get_by_id.return_value = mock_medication
    
    with patch.object(interaction_service.session, 'post') as mock_post:
        mock_post.return_value.json.return_value = {"invalid": "response"}
        mock_post.return_value.raise_for_status = Mock()

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            interaction_service.check_interactions(medication_ids, user_id)
        assert exc_info.value.status_code == 500

def test_check_interactions_retry_success(interaction_service, sample_dosage, sample_schedule):
    """Test successful retry after initial API failure."""
    # Arrange
    medication_ids = [1]
    user_id = 1
    mock_medication = Medication(name="Med1", dosage=sample_dosage, schedule=sample_schedule, user_id=user_id)
    mock_medication.id = 1
    
    interaction_service.medication_repository.get_by_id.return_value = mock_medication
    
    with patch.object(interaction_service.session, 'post') as mock_post:
        # First call fails, second succeeds
        mock_post.side_effect = [
            requests.RequestException("First attempt failed"),
            Mock(
                json=lambda: {"interactions": []},
                raise_for_status=Mock()
            )
        ]

        # Act
        result = interaction_service.check_interactions(medication_ids, user_id)

        # Assert
        assert "interactions" in result
        assert len(result["interactions"]) == 0
        assert mock_post.call_count == 2
