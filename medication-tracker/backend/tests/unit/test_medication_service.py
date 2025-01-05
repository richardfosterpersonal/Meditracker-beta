import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from app.domain.medication.entities import Medication, Dosage, Schedule
from app.application.services.medication_service import MedicationApplicationService
from app.application.dtos.medication import (
    CreateMedicationDTO,
    MedicationResponseDTO,
    DosageDTO,
    ScheduleDTO,
    RecordDoseDTO
)
from app.application.exceptions import (
    NotFoundException,
    ValidationError,
    UnauthorizedError
)

@pytest.fixture
def mock_repositories():
    return {
        "medication_repository": Mock(),
        "notification_service": Mock(),
        "user_repository": Mock(),
        "carer_repository": Mock()
    }

@pytest.fixture
def medication_service(mock_repositories):
    return MedicationApplicationService(
        medication_repository=mock_repositories["medication_repository"],
        notification_service=mock_repositories["notification_service"],
        user_repository=mock_repositories["user_repository"],
        carer_repository=mock_repositories["carer_repository"]
    )

@pytest.fixture
def sample_medication_dto():
    return CreateMedicationDTO(
        name="Test Medication",
        dosage=DosageDTO(
            amount="10",
            unit="mg",
            frequency="daily",
            times_per_day=2,
            specific_times=["09:00", "21:00"]
        ),
        schedule=ScheduleDTO(
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=30),
            reminder_time=30,
            dose_times=["09:00", "21:00"],
            timezone="UTC"
        ),
        user_id=1,
        category="Test Category",
        instructions="Take with water",
        is_prn=False
    )

def test_create_medication_success(medication_service, mock_repositories, sample_medication_dto):
    # Setup
    mock_repositories["user_repository"].get_by_id.return_value = Mock(id=1)
    mock_repositories["medication_repository"].save.return_value = Mock(
        id=1,
        **sample_medication_dto.__dict__
    )

    # Execute
    result = medication_service.create_medication(sample_medication_dto, created_by_id=1)

    # Assert
    assert isinstance(result, MedicationResponseDTO)
    assert result.name == sample_medication_dto.name
    assert result.user_id == sample_medication_dto.user_id
    mock_repositories["medication_repository"].save.assert_called_once()
    mock_repositories["notification_service"].schedule_notification.assert_called()

def test_create_medication_unauthorized(medication_service, mock_repositories, sample_medication_dto):
    # Setup
    mock_repositories["user_repository"].get_by_id.return_value = Mock(id=1)
    mock_repositories["carer_repository"].get_by_user_id.return_value = None

    # Execute and Assert
    with pytest.raises(UnauthorizedError):
        medication_service.create_medication(sample_medication_dto, created_by_id=2)

def test_record_dose_taken_success(medication_service, mock_repositories):
    # Setup
    medication = Mock(
        id=1,
        user_id=1,
        can_take_dose=Mock(return_value=True)
    )
    mock_repositories["medication_repository"].get_by_id.return_value = medication
    
    dto = RecordDoseDTO(
        medication_id=1,
        taken_at=datetime.utcnow()
    )

    # Execute
    result = medication_service.record_dose_taken(dto, recorded_by_id=1)

    # Assert
    assert isinstance(result, MedicationResponseDTO)
    medication.record_dose_taken.assert_called_once_with(dto.taken_at)
    mock_repositories["medication_repository"].update.assert_called_once()

def test_record_dose_taken_cannot_take(medication_service, mock_repositories):
    # Setup
    medication = Mock(
        id=1,
        user_id=1,
        can_take_dose=Mock(return_value=False)
    )
    mock_repositories["medication_repository"].get_by_id.return_value = medication
    
    dto = RecordDoseDTO(
        medication_id=1,
        taken_at=datetime.utcnow()
    )

    # Execute and Assert
    with pytest.raises(ValidationError):
        medication_service.record_dose_taken(dto, recorded_by_id=1)

def test_get_due_medications(medication_service, mock_repositories):
    # Setup
    start_time = datetime.utcnow()
    end_time = start_time + timedelta(days=1)
    
    mock_medication = Mock(
        id=1,
        user_id=1,
        schedule=Mock(dose_times=["09:00", "21:00"])
    )
    mock_repositories["medication_repository"].get_due_medications.return_value = [mock_medication]

    # Execute
    result = medication_service.get_due_medications(1, start_time, end_time)

    # Assert
    assert len(result) > 0
    mock_repositories["medication_repository"].get_due_medications.assert_called_once_with(
        start_time,
        end_time
    )

def test_get_compliance_report(medication_service, mock_repositories):
    # Setup
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=7)
    
    mock_medication = Mock(
        id=1,
        user_id=1,
        schedule=Mock(dose_times=["09:00", "21:00"]),
        doses=[Mock(taken_at=start_date + timedelta(hours=i*12)) for i in range(4)]
    )
    mock_repositories["medication_repository"].get_by_id.return_value = mock_medication

    # Execute
    result = medication_service.get_compliance_report(1, start_date, end_date, user_id=1)

    # Assert
    assert result.medication_id == 1
    assert result.doses_scheduled == 14  # 7 days * 2 doses per day
    assert result.doses_taken == 4
    assert result.doses_missed == 10
    assert result.compliance_rate == 4/14
