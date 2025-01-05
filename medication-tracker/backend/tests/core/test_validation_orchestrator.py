"""
Validation Orchestrator Tests
Validates orchestrator functionality and critical path compliance
Last Updated: 2024-12-24T22:00:52+01:00
"""
import pytest
from pathlib import Path
from typing import Dict, Any

from app.core.validation_orchestrator import (
    ValidationOrchestrator,
    CriticalPathComponent,
    ValidationPhase,
    ValidationStatus,
    ValidationError
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

@pytest.mark.asyncio
async def test_initialization(orchestrator, evidence_collector):
    """Test orchestrator initialization"""
    # Verify all components are initialized
    state = await orchestrator.get_validation_state()
    for component in CriticalPathComponent:
        assert component.value in state
        assert state[component.value]["status"] == ValidationStatus.PENDING.value
    
    # Verify initialization evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["phase"] == ValidationPhase.PRE_INITIALIZATION.value
    assert evidence.data["status"] == ValidationStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_component_validation_success(orchestrator, evidence_collector):
    """Test successful component validation"""
    component = CriticalPathComponent.MEDICATION_TRACKING
    validation_data = {
        "validation_points": [
            "data_integrity",
            "dosage_accuracy",
            "schedule_compliance"
        ],
        "validation_chain": ["evidence_1", "evidence_2"]
    }
    
    # Validate component
    await orchestrator.validate_critical_path_component(
        component,
        validation_data
    )
    
    # Verify component state
    state = await orchestrator.get_validation_state(component)
    assert state["status"] == ValidationStatus.COMPLETED.value
    assert state["validation_chain"] == validation_data["validation_chain"]
    
    # Verify evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["phase"] == ValidationPhase.RUNTIME.value
    assert evidence.data["status"] == ValidationStatus.COMPLETED.value
    assert evidence.data["details"]["component"] == component.value

@pytest.mark.asyncio
async def test_component_validation_failure(orchestrator, evidence_collector):
    """Test component validation failure"""
    component = CriticalPathComponent.SECURITY
    validation_data = {
        "validation_points": []  # Empty validation points should fail
    }
    
    # Attempt validation
    with pytest.raises(ValidationError):
        await orchestrator.validate_critical_path_component(
            component,
            validation_data
        )
    
    # Verify component state
    state = await orchestrator.get_validation_state(component)
    assert state["status"] == ValidationStatus.PENDING.value
    
    # Verify failure evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["phase"] == ValidationPhase.RUNTIME.value
    assert evidence.data["status"] == ValidationStatus.FAILED.value
    assert evidence.data["details"]["component"] == component.value

@pytest.mark.asyncio
async def test_application_validation(orchestrator, evidence_collector):
    """Test full application validation"""
    # Validate all components
    for component in CriticalPathComponent:
        validation_data = {
            "validation_points": ["test_point_1", "test_point_2"],
            "validation_chain": [f"evidence_{component.value}"]
        }
        await orchestrator.validate_critical_path_component(
            component,
            validation_data
        )
    
    # Validate application state
    assert await orchestrator.validate_application_state() is True
    
    # Verify evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["phase"] == ValidationPhase.RUNTIME.value
    assert evidence.data["status"] == ValidationStatus.COMPLETED.value
    assert evidence.data["details"]["action"] == "application_validation_complete"

@pytest.mark.asyncio
async def test_application_validation_failure(orchestrator, evidence_collector):
    """Test application validation with incomplete components"""
    # Only validate one component
    await orchestrator.validate_critical_path_component(
        CriticalPathComponent.METRICS,
        {
            "validation_points": ["test_point"],
            "validation_chain": ["evidence_1"]
        }
    )
    
    # Attempt application validation
    with pytest.raises(ValidationError) as exc_info:
        await orchestrator.validate_application_state()
    
    assert "Incomplete critical path components" in str(exc_info.value)
    
    # Verify failure evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["phase"] == ValidationPhase.RUNTIME.value
    assert evidence.data["status"] == ValidationStatus.FAILED.value
    assert "incomplete_components" in evidence.data["details"]

@pytest.mark.asyncio
async def test_validation_chain_integrity(orchestrator, evidence_collector):
    """Test validation chain maintenance"""
    component = CriticalPathComponent.EVIDENCE_COLLECTION
    validation_steps = [
        {
            "validation_points": ["step_1"],
            "validation_chain": ["evidence_1"]
        },
        {
            "validation_points": ["step_2"],
            "validation_chain": ["evidence_1", "evidence_2"]
        },
        {
            "validation_points": ["step_3"],
            "validation_chain": ["evidence_1", "evidence_2", "evidence_3"]
        }
    ]
    
    # Perform validation steps
    for step_data in validation_steps:
        await orchestrator.validate_critical_path_component(
            component,
            step_data
        )
        
        # Verify chain
        state = await orchestrator.get_validation_state(component)
        assert state["validation_chain"] == step_data["validation_chain"]
    
    # Verify final evidence
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.validation_level == ValidationLevel.HIGH
    assert len(evidence.data["details"]["component"]) > 0
