import pytest
from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.schedule import Schedule
from app.core.scheduling import ScheduleOptimizer

def test_create_medication_schedule(client, auth_headers):
    """Test creating a new medication schedule"""
    schedule_data = {
        "medication_id": 1,
        "frequency": "daily",
        "times": ["09:00", "21:00"],
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "dosage": "10mg",
        "instructions": "Take with food"
    }
    
    response = client.post(
        "/api/schedules",
        json=schedule_data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["frequency"] == schedule_data["frequency"]
    assert len(data["times"]) == len(schedule_data["times"])
    assert data["dosage"] == schedule_data["dosage"]

def test_update_medication_schedule(client, auth_headers, test_schedule):
    """Test updating an existing medication schedule"""
    update_data = {
        "frequency": "weekly",
        "times": ["10:00"],
        "dosage": "20mg"
    }
    
    response = client.put(
        f"/api/schedules/{test_schedule.id}",
        json=update_data,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["frequency"] == update_data["frequency"]
    assert data["dosage"] == update_data["dosage"]

def test_delete_medication_schedule(client, auth_headers, test_schedule):
    """Test deleting a medication schedule"""
    response = client.delete(
        f"/api/schedules/{test_schedule.id}",
        headers=auth_headers
    )
    
    assert response.status_code == 204
    
    # Verify schedule is deleted
    get_response = client.get(
        f"/api/schedules/{test_schedule.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 404

def test_get_user_schedules(client, auth_headers, test_user_with_schedules):
    """Test retrieving all schedules for a user"""
    response = client.get("/api/schedules", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Verify schedule format
    schedule = data[0]
    assert "id" in schedule
    assert "medication_id" in schedule
    assert "frequency" in schedule
    assert "times" in schedule
    assert "dosage" in schedule

def test_schedule_conflict_detection(client, auth_headers):
    """Test detection of conflicting medication schedules"""
    # Create first schedule
    schedule1_data = {
        "medication_id": 1,
        "frequency": "daily",
        "times": ["09:00"],
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "dosage": "10mg"
    }
    
    client.post("/api/schedules", json=schedule1_data, headers=auth_headers)
    
    # Try to create conflicting schedule
    schedule2_data = {
        "medication_id": 2,
        "frequency": "daily",
        "times": ["09:00"],  # Same time as schedule1
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "dosage": "20mg"
    }
    
    response = client.post(
        "/api/schedules",
        json=schedule2_data,
        headers=auth_headers
    )
    
    assert response.status_code == 409
    data = response.json()
    assert "conflict" in data["detail"].lower()

def test_schedule_optimization(test_user_with_schedules):
    """Test schedule optimization algorithm"""
    optimizer = ScheduleOptimizer()
    schedules = Schedule.query.filter_by(user_id=test_user_with_schedules.id).all()
    
    optimized_schedules = optimizer.optimize(schedules)
    
    # Verify optimization results
    assert len(optimized_schedules) > 0
    
    # Check for time clustering
    times = [schedule.time for schedule in optimized_schedules]
    time_differences = []
    for i in range(len(times) - 1):
        diff = (datetime.strptime(times[i+1], "%H:%M") - 
                datetime.strptime(times[i], "%H:%M")).total_seconds() / 3600
        time_differences.append(diff)
    
    # Verify schedules are reasonably spaced
    assert all(diff >= 2 for diff in time_differences)  # At least 2 hours apart

def test_schedule_reminder_generation(test_schedule):
    """Test generation of reminder times for a schedule"""
    reminders = test_schedule.generate_reminders(
        reminder_times=["15min", "1hour"],
        timezone="UTC"
    )
    
    assert len(reminders) > 0
    for reminder in reminders:
        assert "time" in reminder
        assert "type" in reminder
        
        # Verify reminder times are before medication time
        reminder_time = datetime.fromisoformat(reminder["time"])
        medication_time = datetime.fromisoformat(test_schedule.next_dose_time())
        assert reminder_time < medication_time

def test_schedule_adherence_tracking(client, auth_headers, test_schedule):
    """Test tracking medication adherence for a schedule"""
    # Log a dose
    dose_data = {
        "schedule_id": test_schedule.id,
        "taken_at": datetime.now().isoformat(),
        "status": "taken",
        "notes": "Taken with breakfast"
    }
    
    response = client.post(
        "/api/doses",
        json=dose_data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    
    # Get adherence stats
    stats_response = client.get(
        f"/api/schedules/{test_schedule.id}/adherence",
        headers=auth_headers
    )
    
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert "adherence_rate" in stats
    assert "doses_taken" in stats
    assert "doses_missed" in stats
    assert stats["doses_taken"] > 0
