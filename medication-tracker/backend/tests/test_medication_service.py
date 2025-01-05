import pytest
from datetime import datetime, timedelta
from app.services.medication_service import MedicationService
from app.api.schemas.medication import MedicationCreate, MedicationUpdate, MedicationResponse
from app.infrastructure.persistence.models.medication import MedicationModel

@pytest.fixture
def medication_service(db_session):
    return MedicationService(db_session)

@pytest.fixture
def sample_medication_data():
    now = datetime.utcnow()
    return {
        "name": "Test Medication",
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

def test_create_medication(medication_service, sample_medication_data):
    # Create medication
    medication_data = MedicationCreate(**sample_medication_data)
    response = medication_service.create_medication(1, medication_data)
    
    assert isinstance(response, MedicationResponse)
    assert response.name == sample_medication_data["name"]
    assert response.user_id == sample_medication_data["user_id"]
    assert response.dosage.amount == sample_medication_data["dosage"]["amount"]
    assert response.schedule.reminder_time == sample_medication_data["schedule"]["reminder_time"]

def test_get_medication(medication_service, sample_medication_data):
    # First create a medication
    medication_data = MedicationCreate(**sample_medication_data)
    created = medication_service.create_medication(1, medication_data)
    
    # Get the medication
    response = medication_service.get_medication(created.id)
    
    assert isinstance(response, MedicationResponse)
    assert response.id == created.id
    assert response.name == sample_medication_data["name"]

def test_update_medication(medication_service, sample_medication_data):
    # First create a medication
    medication_data = MedicationCreate(**sample_medication_data)
    created = medication_service.create_medication(1, medication_data)
    
    # Update the medication
    update_data = MedicationUpdate(
        name="Updated Medication",
        dosage=created.dosage,
        schedule=created.schedule,
        category="updated_category"
    )
    
    response = medication_service.update_medication(created.id, update_data)
    
    assert isinstance(response, MedicationResponse)
    assert response.id == created.id
    assert response.name == "Updated Medication"
    assert response.category == "updated_category"

def test_get_user_medications(medication_service, sample_medication_data):
    # Create multiple medications
    medication_data = MedicationCreate(**sample_medication_data)
    medication_service.create_medication(1, medication_data)
    
    # Create another medication for the same user
    sample_medication_data["name"] = "Second Medication"
    second_medication_data = MedicationCreate(**sample_medication_data)
    medication_service.create_medication(1, second_medication_data)
    
    # Get all medications for user
    medications = medication_service.get_user_medications(1)
    
    assert isinstance(medications, list)
    assert len(medications) == 2
    assert all(isinstance(med, MedicationResponse) for med in medications)
    assert any(med.name == "Test Medication" for med in medications)
    assert any(med.name == "Second Medication" for med in medications)
