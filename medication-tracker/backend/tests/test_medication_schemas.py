import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError
from app.api.schemas.medication import (
    DosageBase,
    ScheduleBase,
    MedicationBase,
    MedicationCreate,
    MedicationUpdate,
    MedicationResponse
)

def test_dosage_base_validation():
    # Valid dosage
    valid_data = {
        "amount": 1.5,
        "unit": "mg",
        "frequency": "daily",
        "times_per_day": 2,
        "specific_times": ["09:00", "21:00"]
    }
    dosage = DosageBase(**valid_data)
    assert dosage.amount == 1.5
    assert dosage.times_per_day == 2

    # Invalid amount
    with pytest.raises(ValidationError):
        DosageBase(**{**valid_data, "amount": -1})

    # Invalid times_per_day
    with pytest.raises(ValidationError):
        DosageBase(**{**valid_data, "times_per_day": 0})

def test_schedule_base_validation():
    now = datetime.utcnow()
    # Valid schedule
    valid_data = {
        "start_date": now,
        "end_date": now + timedelta(days=30),
        "reminder_time": 30,
        "dose_times": ["09:00", "21:00"],
        "timezone": "UTC"
    }
    schedule = ScheduleBase(**valid_data)
    assert schedule.reminder_time == 30
    assert len(schedule.dose_times) == 2

def test_medication_create_validation():
    now = datetime.utcnow()
    valid_data = {
        "name": "Test Med",
        "dosage": {
            "amount": 1.5,
            "unit": "mg",
            "frequency": "daily",
            "times_per_day": 2,
            "specific_times": ["09:00", "21:00"]
        },
        "schedule": {
            "start_date": now,
            "end_date": now + timedelta(days=30),
            "reminder_time": 30,
            "dose_times": ["09:00", "21:00"],
            "timezone": "UTC"
        },
        "user_id": 1,
        "category": "pain",
        "instructions": "Take with food",
        "is_prn": False
    }
    med = MedicationCreate(**valid_data)
    assert med.name == "Test Med"
    assert med.user_id == 1
    assert med.is_prn == False

    # Test required fields
    with pytest.raises(ValidationError):
        MedicationCreate(**{k: v for k, v in valid_data.items() if k != "name"})

def test_medication_update_validation():
    now = datetime.utcnow()
    valid_data = {
        "name": "Updated Med",
        "dosage": {
            "amount": 2.0,
            "unit": "mg",
            "frequency": "daily",
            "times_per_day": 1,
            "specific_times": ["09:00"]
        },
        "schedule": {
            "start_date": now,
            "end_date": now + timedelta(days=15),
            "reminder_time": 15,
            "dose_times": ["09:00"],
            "timezone": "UTC"
        },
        "user_id": 1
    }
    med = MedicationUpdate(**valid_data)
    assert med.name == "Updated Med"
    assert med.dosage.amount == 2.0

def test_medication_response_validation():
    now = datetime.utcnow()
    valid_data = {
        "id": 1,
        "name": "Test Med",
        "dosage": {
            "amount": 1.5,
            "unit": "mg",
            "frequency": "daily",
            "times_per_day": 2,
            "specific_times": ["09:00", "21:00"]
        },
        "schedule": {
            "start_date": now,
            "end_date": now + timedelta(days=30),
            "reminder_time": 30,
            "dose_times": ["09:00", "21:00"],
            "timezone": "UTC"
        },
        "user_id": 1,
        "created_at": now,
        "updated_at": now,
        "last_taken": now - timedelta(hours=12),
        "daily_doses_taken": 1,
        "daily_doses_reset_at": now.replace(hour=0, minute=0, second=0, microsecond=0)
    }
    med = MedicationResponse(**valid_data)
    assert med.id == 1
    assert med.daily_doses_taken == 1
    assert med.last_taken is not None
