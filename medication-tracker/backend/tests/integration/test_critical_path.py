"""
Critical Path Integration Tests
Validates end-to-end functionality of core features
Last Updated: 2024-12-24T22:06:31+01:00
"""
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.medication_tracker import MedicationTracker
from app.core.validation_orchestrator import (
    ValidationOrchestrator,
    CriticalPathComponent
)
from app.core.evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)
from app.core.user_management import UserManagement
from app.core.reminder_system import ReminderSystem

@pytest.fixture
async def setup_critical_path(tmp_path):
    """Set up all required components for critical path testing"""
    # Set up directories
    evidence_dir = tmp_path / "evidence"
    validation_dir = tmp_path / "validation"
    storage_dir = tmp_path / "storage"
    
    # Initialize components
    evidence_collector = EvidenceCollector(
        evidence_dir=str(evidence_dir)
    )
    
    orchestrator = ValidationOrchestrator(
        evidence_collector=evidence_collector,
        validation_dir=str(validation_dir)
    )
    await orchestrator.initialize_validation()
    
    # Initialize core components
    medication_tracker = MedicationTracker(
        validation_orchestrator=orchestrator,
        evidence_collector=evidence_collector,
        storage_dir=str(storage_dir / "medications")
    )
    
    user_management = UserManagement(
        validation_orchestrator=orchestrator,
        evidence_collector=evidence_collector,
        storage_dir=str(storage_dir / "users")
    )
    
    reminder_system = ReminderSystem(
        validation_orchestrator=orchestrator,
        evidence_collector=evidence_collector,
        storage_dir=str(storage_dir / "reminders")
    )
    
    return {
        "orchestrator": orchestrator,
        "evidence_collector": evidence_collector,
        "medication_tracker": medication_tracker,
        "user_management": user_management,
        "reminder_system": reminder_system
    }

@pytest.mark.asyncio
async def test_user_medication_flow(setup_critical_path):
    """Test complete user medication management flow"""
    components = setup_critical_path
    
    # 1. Create user
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "timezone": "UTC"
    }
    user = await components["user_management"].create_user(user_data)
    assert user["status"] == "created"
    
    # 2. Add medication
    medication_data = {
        "name": "Test Medication",
        "dosage": 100,
        "unit": "mg",
        "frequency": "daily",
        "schedule": {
            "times": ["09:00", "21:00"],
            "days": ["Monday", "Wednesday", "Friday"]
        }
    }
    medication = await components["medication_tracker"].add_medication(
        user["user_id"],
        medication_data
    )
    assert medication["status"] == "added"
    
    # 3. Create reminders
    reminder_data = {
        "medication_id": medication["medication_id"],
        "user_id": user["user_id"],
        "schedule": medication_data["schedule"]
    }
    reminder = await components["reminder_system"].create_reminder(
        reminder_data
    )
    assert reminder["status"] == "created"
    
    # Verify critical path completion
    state = await components["orchestrator"].get_validation_state()
    assert state[CriticalPathComponent.MEDICATION_TRACKING.value]["status"] == "completed"
    assert len(state[CriticalPathComponent.MEDICATION_TRACKING.value]["validation_chain"]) > 0

@pytest.mark.asyncio
async def test_medication_update_flow(setup_critical_path):
    """Test medication update and reminder sync flow"""
    components = setup_critical_path
    
    # 1. Initial setup
    user = await components["user_management"].create_user({
        "username": "updateuser",
        "email": "update@example.com"
    })
    
    medication = await components["medication_tracker"].add_medication(
        user["user_id"],
        {
            "name": "Update Med",
            "dosage": 50,
            "unit": "mg",
            "frequency": "daily"
        }
    )
    
    # 2. Update medication schedule
    new_schedule = {
        "times": ["10:00"],
        "days": ["Tuesday", "Thursday"]
    }
    update = await components["medication_tracker"].update_schedule(
        user["user_id"],
        medication["medication_id"],
        new_schedule
    )
    assert update["status"] == "updated"
    
    # 3. Verify reminder sync
    reminders = await components["reminder_system"].get_reminders(
        user["user_id"],
        medication["medication_id"]
    )
    assert reminders[0]["schedule"] == new_schedule
    
    # Verify validation chain
    evidence = await components["evidence_collector"].get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence.validation_level == ValidationLevel.HIGH
    assert "schedule_update" in str(evidence.data)

@pytest.mark.asyncio
async def test_edge_case_scenarios(setup_critical_path):
    """Test edge cases and error scenarios"""
    components = setup_critical_path
    
    # 1. Test duplicate medication
    user = await components["user_management"].create_user({
        "username": "edgeuser",
        "email": "edge@example.com"
    })
    
    med_data = {
        "name": "Edge Med",
        "dosage": 75,
        "unit": "mg",
        "frequency": "daily"
    }
    
    # First addition should succeed
    med1 = await components["medication_tracker"].add_medication(
        user["user_id"],
        med_data
    )
    assert med1["status"] == "added"
    
    # Second addition should be handled gracefully
    med2 = await components["medication_tracker"].add_medication(
        user["user_id"],
        med_data
    )
    assert "duplicate" in med2["status"]
    
    # 2. Test invalid schedule update
    invalid_schedule = {
        "times": ["invalid_time"],
        "days": ["invalid_day"]
    }
    try:
        await components["medication_tracker"].update_schedule(
            user["user_id"],
            med1["medication_id"],
            invalid_schedule
        )
        assert False, "Should have raised validation error"
    except Exception as e:
        assert "validation" in str(e).lower()
    
    # Verify error handling evidence
    evidence = await components["evidence_collector"].get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence.data["status"] == "failed"
    assert "validation_error" in str(evidence.data)

@pytest.mark.asyncio
async def test_concurrent_operations(setup_critical_path):
    """Test concurrent medication operations"""
    components = setup_critical_path
    
    # 1. Create test user
    user = await components["user_management"].create_user({
        "username": "concurrentuser",
        "email": "concurrent@example.com"
    })
    
    # 2. Add multiple medications concurrently
    medications = [
        {
            "name": f"Concurrent Med {i}",
            "dosage": 50 * i,
            "unit": "mg",
            "frequency": "daily"
        }
        for i in range(1, 4)
    ]
    
    # Add medications concurrently
    results = await asyncio.gather(*[
        components["medication_tracker"].add_medication(
            user["user_id"],
            med_data
        )
        for med_data in medications
    ])
    
    # Verify all operations succeeded
    assert all(r["status"] == "added" for r in results)
    
    # Verify validation chain integrity
    state = await components["orchestrator"].get_validation_state(
        CriticalPathComponent.MEDICATION_TRACKING
    )
    assert len(state["validation_chain"]) >= len(medications)
    
    # Verify evidence collection
    evidences = await components["evidence_collector"].get_evidence_chain(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert len(evidences) >= len(medications)

@pytest.mark.asyncio
async def test_reminder_notification_flow(setup_critical_path):
    """Test reminder creation and notification flow"""
    components = setup_critical_path
    
    # 1. Create user with timezone
    user = await components["user_management"].create_user({
        "username": "reminderuser",
        "email": "reminder@example.com",
        "timezone": "UTC"
    })
    
    # 2. Add medication with specific schedule
    current_time = datetime.fromisoformat("2024-12-24T22:06:31+01:00")
    reminder_time = (current_time + timedelta(minutes=5)).strftime("%H:%M")
    
    medication = await components["medication_tracker"].add_medication(
        user["user_id"],
        {
            "name": "Reminder Med",
            "dosage": 100,
            "unit": "mg",
            "frequency": "daily",
            "schedule": {
                "times": [reminder_time],
                "days": ["Monday", "Wednesday", "Friday"]
            }
        }
    )
    
    # 3. Create and verify reminder
    reminder = await components["reminder_system"].create_reminder({
        "medication_id": medication["medication_id"],
        "user_id": user["user_id"],
        "schedule": medication["schedule"]
    })
    
    assert reminder["status"] == "created"
    assert reminder["next_reminder"] is not None
    
    # 4. Verify notification generation
    notifications = await components["reminder_system"].get_pending_notifications(
        user["user_id"]
    )
    assert len(notifications) > 0
    assert notifications[0]["medication_id"] == medication["medication_id"]
    
    # Verify validation chain
    evidence = await components["evidence_collector"].get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence.validation_level == ValidationLevel.HIGH
    assert "reminder_creation" in str(evidence.data)
