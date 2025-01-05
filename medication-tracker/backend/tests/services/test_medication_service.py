"""Tests for the MedicationService."""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.services.medication_service import MedicationService
from app.infrastructure.database.models import Medication
from app.domain.medication.entities import MedicationEntity, Dosage, Schedule
from app.core.audit import AuditEventType

@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return Mock()

@pytest.fixture
def medication_service(mock_db_session):
    """Create a MedicationService instance with a mock database session."""
    return MedicationService(mock_db_session)

@pytest.fixture
def sample_dosage():
    """Create a sample dosage for testing."""
    return Dosage(
        amount="10mg",
        unit="mg",
        frequency="daily",
        times_per_day=1,
        specific_times=["09:00"]
    )

@pytest.fixture
def sample_schedule():
    """Create a sample schedule for testing."""
    return Schedule(
        start_date=datetime.now(timezone.utc),
        end_date=None,
        reminder_time=30,
        dose_times=["09:00"],
        timezone="UTC"
    )

@pytest.fixture
def sample_medication_model():
    """Create a sample medication model for testing."""
    return Medication(
        id=1,
        user_id=1,
        name="Test Medication",
        dosage={"amount": "10mg", "unit": "mg", "frequency": "daily", "times_per_day": 1, "specific_times": ["09:00"]},
        schedule={"start_date": datetime.now(timezone.utc).isoformat(), "reminder_time": 30, "dose_times": ["09:00"], "timezone": "UTC"},
        instructions="Test notes",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

class TestMedicationService:
    """Test cases for MedicationService."""

    def test_get_medication_found(self, medication_service, mock_db_session, sample_medication_model):
        """Test retrieving an existing medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_medication_model
        
        result = medication_service.get_medication(1)
        
        assert result is not None
        assert result.name == "Test Medication"
        assert result.dosage.amount == "10mg"
        mock_db_session.query.assert_called_once_with(Medication)
        mock_db_session.query.return_value.filter.assert_called_once()

    def test_get_medication_not_found(self, medication_service, mock_db_session):
        """Test retrieving a non-existent medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        result = medication_service.get_medication(999)
        
        assert result is None
        mock_db_session.query.assert_called_once_with(Medication)

    def test_get_user_medications(self, medication_service, mock_db_session, sample_medication_model):
        """Test retrieving all medications for a user."""
        mock_db_session.query.return_value.filter.return_value.all.return_value = [sample_medication_model]
        
        results = medication_service.get_user_medications(1)
        
        assert len(results) == 1
        assert results[0].name == "Test Medication"
        assert results[0].dosage.amount == "10mg"
        mock_db_session.query.assert_called_once_with(Medication)

    def test_create_medication(self, medication_service, mock_db_session, sample_dosage, sample_schedule):
        """Test creating a new medication."""
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()
        
        medication_data = MedicationEntity(
            name="Test Medication",
            dosage=sample_dosage,
            schedule=sample_schedule,
            user_id=1,
            instructions="Test notes"
        )
        
        with patch('app.core.audit.audit_logger.log_event') as mock_audit:
            result = medication_service.create_medication(1, medication_data)
            
            mock_db_session.add.assert_called_once()
            mock_db_session.commit.assert_called_once()
            mock_audit.assert_called_once()
            assert mock_audit.call_args[1]['event_type'] == AuditEventType.DATA_MODIFY
            assert mock_audit.call_args[1]['action'] == "create"

    def test_update_medication_success(self, medication_service, mock_db_session, sample_medication_model, sample_dosage, sample_schedule):
        """Test successfully updating a medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_medication_model
        mock_db_session.commit = Mock()
        
        update_data = MedicationEntity(
            name="Updated Medication",
            dosage=sample_dosage,
            schedule=sample_schedule,
            user_id=1
        )
        
        with patch('app.core.audit.audit_logger.log_event') as mock_audit:
            result = medication_service.update_medication(1, update_data)
            
            assert result is not None
            mock_db_session.commit.assert_called_once()
            mock_audit.assert_called_once()
            assert mock_audit.call_args[1]['event_type'] == AuditEventType.DATA_MODIFY
            assert mock_audit.call_args[1]['action'] == "update"

    def test_update_medication_not_found(self, medication_service, mock_db_session, sample_dosage, sample_schedule):
        """Test updating a non-existent medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        update_data = MedicationEntity(
            name="Updated Medication",
            dosage=sample_dosage,
            schedule=sample_schedule,
            user_id=1
        )
        
        result = medication_service.update_medication(999, update_data)
        
        assert result is None
        mock_db_session.commit.assert_not_called()

    def test_delete_medication_success(self, medication_service, mock_db_session, sample_medication_model):
        """Test successfully deleting a medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_medication_model
        mock_db_session.delete = Mock()
        mock_db_session.commit = Mock()
        
        with patch('app.core.audit.audit_logger.log_event') as mock_audit:
            result = medication_service.delete_medication(1)
            
            assert result is True
            mock_db_session.delete.assert_called_once()
            mock_db_session.commit.assert_called_once()
            mock_audit.assert_called_once()
            assert mock_audit.call_args[1]['event_type'] == AuditEventType.DATA_MODIFY
            assert mock_audit.call_args[1]['action'] == "delete"

    def test_delete_medication_not_found(self, medication_service, mock_db_session):
        """Test deleting a non-existent medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        result = medication_service.delete_medication(999)
        
        assert result is False
        mock_db_session.delete.assert_not_called()
        mock_db_session.commit.assert_not_called()

    def test_create_medication_invalid_dates(self, medication_service, mock_db_session, sample_dosage):
        """Test creating a medication with end_date before start_date."""
        start_date = datetime(2024, 12, 31, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
        
        schedule = Schedule(
            start_date=start_date,
            end_date=end_date,
            reminder_time=30,
            dose_times=["09:00"],
            timezone="UTC"
        )
        
        medication_data = MedicationEntity(
            name="Test Medication",
            dosage=sample_dosage,
            schedule=schedule,
            user_id=1,
            instructions="Test notes"
        )
        
        with pytest.raises(ValueError):
            medication_service.create_medication(1, medication_data)

    def test_update_medication_concurrent_modification(self, medication_service, mock_db_session, sample_medication_model, sample_dosage, sample_schedule):
        """Test handling concurrent updates to the same medication."""
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_medication_model
        mock_db_session.commit.side_effect = Exception("Concurrent modification detected")
        
        update_data = MedicationEntity(
            name="Updated Medication",
            dosage=sample_dosage,
            schedule=sample_schedule,
            user_id=1
        )
        
        with pytest.raises(Exception):
            medication_service.update_medication(1, update_data)

    def test_create_medication_missing_required_fields(self, medication_service, mock_db_session, sample_schedule):
        """Test creating a medication with missing required fields."""
        dosage = Dosage(
            amount="",  # Empty amount
            unit="mg",
            frequency="daily",
            times_per_day=1,
            specific_times=["09:00"]
        )
        
        medication_data = MedicationEntity(
            name="Test Medication",
            dosage=dosage,
            schedule=sample_schedule,
            user_id=1
        )
        
        with pytest.raises(ValueError):
            medication_service.create_medication(1, medication_data)
