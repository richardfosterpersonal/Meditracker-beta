"""
Medication Tracker Tests
Validates medication tracking functionality with validation integration
Last Updated: 2024-12-24T22:02:51+01:00
"""
import pytest
from pathlib import Path
from typing import Dict, Any

from app.core.medication_tracker import (
    MedicationTracker,
    MedicationValidationPoint
)
from app.core.validation_orchestrator import (
    ValidationOrchestrator,
    CriticalPathComponent,
    ValidationPhase,
    ValidationStatus
)
from app.core.evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)

@pytest.fixture
def evidence_collector(tmp_path):
    evidence_dir = tmp_path / "evidence"
    return EvidenceCollector(evidence_dir=str(evidence_dir))

@pytest.fixture
def validation_dir(tmp_path):
    return tmp_path / "validation"

@pytest.fixture
async def orchestrator(validation_dir, evidence_collector):
    orchestrator = ValidationOrchestrator(
        evidence_collector=evidence_collector,
        validation_dir=str(validation_dir)
    )
    await orchestrator.initialize_validation()
    return orchestrator

@pytest.fixture
def storage_dir(tmp_path):
    return tmp_path / "medications"

@pytest.fixture
async def medication_tracker(
    storage_dir,
    orchestrator,
    evidence_collector
):
    return MedicationTracker(
        validation_orchestrator=orchestrator,
        evidence_collector=evidence_collector,
        storage_dir=str(storage_dir)
    )

@pytest.mark.asyncio
async def test_initialization(
    medication_tracker,
    orchestrator,
    evidence_collector
):
    """Test tracker initialization with validation"""
    # Verify component state
    state = await orchestrator.get_validation_state(
        CriticalPathComponent.MEDICATION_TRACKING
    )
    assert state["status"] == ValidationStatus.COMPLETED.value
    
    # Verify validation points
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert all(
        point.value in str(evidence.data)
        for point in MedicationValidationPoint
    )

@pytest.mark.asyncio
async def test_add_medication(
    medication_tracker,
    evidence_collector
):
    """Test medication addition with validation"""
    user_id = "test_user"
    medication_data = {
        "name": "Test Med",
        "dosage": 100,
        "unit": "mg",
        "frequency": "daily"
    }
    
    result = await medication_tracker.add_medication(
        user_id,
        medication_data
    )
    
    # Verify result
    assert result["status"] == "added"
    assert "medication_id" in result
    assert len(result["validation_chain"]) > 0
    
    # Verify evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert evidence is not None
    assert evidence.data["action"] == "add_medication"
    assert evidence.data["medication"] == medication_data

@pytest.mark.asyncio
async def test_update_schedule(
    medication_tracker,
    evidence_collector
):
    """Test schedule update with validation"""
    user_id = "test_user"
    medication_id = "test_med"
    schedule_data = {
        "times": ["09:00", "21:00"],
        "days": ["Monday", "Wednesday", "Friday"]
    }
    
    result = await medication_tracker.update_schedule(
        user_id,
        medication_id,
        schedule_data
    )
    
    # Verify result
    assert result["status"] == "updated"
    assert len(result["validation_chain"]) > 0
    
    # Verify evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert evidence is not None
    assert evidence.data["action"] == "update_schedule"
    assert evidence.data["schedule"] == schedule_data

@pytest.mark.asyncio
async def test_record_intake(
    medication_tracker,
    evidence_collector
):
    """Test intake recording with validation"""
    user_id = "test_user"
    medication_id = "test_med"
    intake_data = {
        "time": "2024-12-24T22:02:51+01:00",
        "taken": True,
        "notes": "Test intake"
    }
    
    result = await medication_tracker.record_intake(
        user_id,
        medication_id,
        intake_data
    )
    
    # Verify result
    assert result["status"] == "recorded"
    assert "intake_id" in result
    assert len(result["validation_chain"]) > 0
    
    # Verify evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert evidence is not None
    assert evidence.data["action"] == "record_intake"
    assert evidence.data["intake"] == intake_data

@pytest.mark.asyncio
async def test_get_user_medications(
    medication_tracker,
    evidence_collector
):
    """Test medication retrieval with validation"""
    user_id = "test_user"
    
    result = await medication_tracker.get_user_medications(user_id)
    
    # Verify validation chain
    latest_evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert latest_evidence is not None
    assert latest_evidence.data["validation_point"] == MedicationValidationPoint.DATA_INTEGRITY.value
    
    # Verify medication evidence
    med_evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert med_evidence is not None
    assert med_evidence.data["action"] == "get_medications"
    assert med_evidence.data["user_id"] == user_id

@pytest.mark.asyncio
async def test_validation_chain_integrity(
    medication_tracker,
    evidence_collector
):
    """Test validation chain maintenance"""
    user_id = "test_user"
    
    # Add medication
    med_result = await medication_tracker.add_medication(
        user_id,
        {
            "name": "Test Chain Med",
            "dosage": 50,
            "unit": "mg",
            "frequency": "daily"
        }
    )
    
    # Update schedule
    schedule_result = await medication_tracker.update_schedule(
        user_id,
        med_result["medication_id"],
        {
            "times": ["08:00"],
            "days": ["Monday"]
        }
    )
    
    # Record intake
    intake_result = await medication_tracker.record_intake(
        user_id,
        med_result["medication_id"],
        {
            "time": "2024-12-24T22:02:51+01:00",
            "taken": True
        }
    )
    
    # Verify chain integrity
    assert all(
        evidence_id in intake_result["validation_chain"]
        for evidence_id in med_result["validation_chain"]
    )
    assert all(
        evidence_id in intake_result["validation_chain"]
        for evidence_id in schedule_result["validation_chain"]
    )
