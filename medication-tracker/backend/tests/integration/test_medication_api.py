import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app
from app.models.medication import MedicationType, Schedule, ScheduleType
from app.models.user import UserRole
from tests.fixtures import create_test_user, create_test_medication

client = TestClient(app)

@pytest.fixture
def auth_headers(test_db):
    user = create_test_user(role=UserRole.INDIVIDUAL)
    response = client.post("/auth/login", json={
        "email": user.email,
        "password": "testpassword123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_medication(auth_headers):
    medication_data = {
        "name": "Test Medication",
        "type": MedicationType.PRESCRIPTION,
        "schedule": {
            "type": ScheduleType.FIXED_TIME,
            "times": ["09:00", "21:00"],
            "dose": 1
        },
        "notes": "Test notes"
    }
    
    response = client.post("/api/medications", json=medication_data, headers=auth_headers)
    assert response.status_code == 201
    
    data = response.json()
    assert data["name"] == medication_data["name"]
    assert data["schedule"]["type"] == ScheduleType.FIXED_TIME
    assert len(data["schedule"]["times"]) == 2

def test_get_medications(auth_headers, test_db):
    # Create test medications
    user = create_test_user(role=UserRole.INDIVIDUAL)
    med1 = create_test_medication(user_id=user.id)
    med2 = create_test_medication(user_id=user.id)
    
    response = client.get("/api/medications", headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    assert any(med["id"] == str(med1.id) for med in data)
    assert any(med["id"] == str(med2.id) for med in data)

def test_update_medication_schedule(auth_headers, test_db):
    user = create_test_user(role=UserRole.INDIVIDUAL)
    med = create_test_medication(user_id=user.id)
    
    new_schedule = {
        "type": ScheduleType.INTERVAL,
        "interval_hours": 8,
        "dose": 1
    }
    
    response = client.patch(
        f"/api/medications/{med.id}/schedule",
        json=new_schedule,
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["schedule"]["type"] == ScheduleType.INTERVAL
    assert data["schedule"]["interval_hours"] == 8

def test_medication_conflict_detection(auth_headers, test_db):
    user = create_test_user(role=UserRole.INDIVIDUAL)
    
    # Create existing medication with schedule
    existing_med = create_test_medication(
        user_id=user.id,
        schedule={
            "type": ScheduleType.FIXED_TIME,
            "times": ["09:00"],
            "dose": 1
        }
    )
    
    # Try to create new medication with conflicting schedule
    new_med_data = {
        "name": "Conflicting Med",
        "type": MedicationType.PRESCRIPTION,
        "schedule": {
            "type": ScheduleType.FIXED_TIME,
            "times": ["09:00"],
            "dose": 1
        }
    }
    
    response = client.post("/api/medications", json=new_med_data, headers=auth_headers)
    assert response.status_code == 409
    assert "schedule conflict" in response.json()["detail"].lower()

def test_medication_validation(auth_headers):
    invalid_schedule = {
        "name": "Test Med",
        "type": MedicationType.PRESCRIPTION,
        "schedule": {
            "type": ScheduleType.INTERVAL,
            "interval_hours": 3,  # Too frequent
            "dose": 1
        }
    }
    
    response = client.post("/api/medications", json=invalid_schedule, headers=auth_headers)
    assert response.status_code == 400
    assert "interval must be at least 4 hours" in response.json()["detail"].lower()

def test_get_medication_history(auth_headers, test_db):
    user = create_test_user(role=UserRole.INDIVIDUAL)
    med = create_test_medication(user_id=user.id)
    
    # Add some history entries
    history_data = {
        "taken_at": datetime.utcnow().isoformat(),
        "dose_taken": 1,
        "notes": "Test dose"
    }
    
    # Record several doses
    for _ in range(3):
        client.post(
            f"/api/medications/{med.id}/history",
            json=history_data,
            headers=auth_headers
        )
    
    response = client.get(f"/api/medications/{med.id}/history", headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 3
    assert all("taken_at" in entry for entry in data)

def test_delete_medication(auth_headers, test_db):
    user = create_test_user(role=UserRole.INDIVIDUAL)
    med = create_test_medication(user_id=user.id)
    
    response = client.delete(f"/api/medications/{med.id}", headers=auth_headers)
    assert response.status_code == 204
    
    # Verify medication is deleted
    response = client.get(f"/api/medications/{med.id}", headers=auth_headers)
    assert response.status_code == 404
