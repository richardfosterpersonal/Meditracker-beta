"""
Beta Critical Path Tests
Tests the beta testing critical path functionality
Last Updated: 2024-12-31T15:58:30+01:00
"""

import pytest
from datetime import datetime
from typing import Dict, List

from app.core.critical_path import critical_path
from app.core.beta_critical_path_orchestrator import (
    BetaCriticalPathOrchestrator,
    BetaPhaseStatus
)
from app.core.beta_requirements_validator import BetaRequirementsValidator
from app.core.validation_types import ValidationLevel, ValidationStatus

@pytest.fixture
def orchestrator():
    """Create beta critical path orchestrator"""
    return BetaCriticalPathOrchestrator()

@pytest.fixture
def validator():
    """Create beta requirements validator"""
    return BetaRequirementsValidator()

@pytest.mark.asyncio
async def test_beta_onboarding_phase(orchestrator, validator):
    """Test Beta.Onboarding phase"""
    # Start Beta.Onboarding phase
    result = await orchestrator.start_phase("ONBOARDING")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
    
    # Validate onboarding components
    for stage in critical_path.paths["Beta.Onboarding"]["stages"]:
        validation = await validator.validate_core_functionality({
            "component": stage,
            "timestamp": datetime.utcnow().isoformat()
        })
        assert validation["valid"] is True
        
    # Complete phase
    result = await orchestrator.complete_phase("ONBOARDING")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_core_features_phase(orchestrator, validator):
    """Test Core.Features phase"""
    # Start Core.Features phase
    result = await orchestrator.start_phase("CORE_FEATURES")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
    
    # Validate core components
    for component in critical_path.paths["Core.Features"]["components"]:
        validation = await validator.validate_core_functionality({
            "component": component,
            "timestamp": datetime.utcnow().isoformat()
        })
        assert validation["valid"] is True
        
    # Complete phase
    result = await orchestrator.complete_phase("CORE_FEATURES")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_data_safety_phase(orchestrator, validator):
    """Test Data.Safety phase"""
    # Start Data.Safety phase
    result = await orchestrator.start_phase("DATA_SAFETY")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
    
    # Validate safety requirements
    for requirement in critical_path.paths["Data.Safety"]["requirements"]:
        validation = await validator.validate_core_functionality({
            "component": requirement,
            "timestamp": datetime.utcnow().isoformat()
        })
        assert validation["valid"] is True
        
    # Complete phase
    result = await orchestrator.complete_phase("DATA_SAFETY")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_user_experience_phase(orchestrator, validator):
    """Test User.Experience phase"""
    # Start User.Experience phase
    result = await orchestrator.start_phase("USER_EXPERIENCE")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
    
    # Validate UX metrics
    for metric in critical_path.paths["User.Experience"]["metrics"]:
        validation = await validator.validate_user_experience({
            "metric": metric,
            "timestamp": datetime.utcnow().isoformat()
        })
        assert validation["valid"] is True
        
    # Complete phase
    result = await orchestrator.complete_phase("USER_EXPERIENCE")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_phase_sequence(orchestrator):
    """Test phase sequence validation"""
    # Try to start Core.Features before Beta.Onboarding
    result = await orchestrator.start_phase("CORE_FEATURES")
    assert result["success"] is False
    assert "Previous phase" in result["error"]
    
    # Start and complete Beta.Onboarding
    await orchestrator.start_phase("ONBOARDING")
    await orchestrator.complete_phase("ONBOARDING")
    
    # Now Core.Features should start
    result = await orchestrator.start_phase("CORE_FEATURES")
    assert result["success"] is True
    assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
    
    # Try to skip Data.Safety
    result = await orchestrator.start_phase("USER_EXPERIENCE")
    assert result["success"] is False
    assert "Previous phase" in result["error"]
