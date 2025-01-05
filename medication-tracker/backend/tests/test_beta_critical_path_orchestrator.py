"""
Beta Critical Path Orchestrator Test Suite
Tests for beta critical path orchestration
Last Updated: 2024-12-30T22:04:36+01:00
"""

import pytest
import os
import json
from datetime import datetime
import asyncio
from typing import Dict

from app.core.beta_critical_path_orchestrator import (
    BetaCriticalPathOrchestrator,
    BetaPhaseStatus
)
from app.core.settings import settings

@pytest.fixture
async def orchestrator():
    """Beta critical path orchestrator fixture"""
    return BetaCriticalPathOrchestrator()

class TestBetaCriticalPathOrchestrator:
    """Test beta critical path orchestration"""
    
    @pytest.mark.asyncio
    async def test_critical_path_initialization(self, orchestrator):
        """Test critical path initialization"""
        # Initialize critical path
        result = await orchestrator.initialize_critical_path()
        
        # Assert
        assert result["success"] == True
        assert "phases" in result
        assert "current_phase" in result
        assert "status" in result
        assert result["status"] == BetaPhaseStatus.IN_PROGRESS.value
        
        # Check phase status
        status = await orchestrator.get_critical_path_status()
        assert status["success"] == True
        assert status["current_phase"] == result["current_phase"]
        
    @pytest.mark.asyncio
    async def test_phase_progression(self, orchestrator):
        """Test phase progression"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get first phase
        phases = list(settings.BETA_PHASES.keys())
        first_phase = phases[0]
        
        # Validate progression
        validation = await orchestrator.validate_phase_progression(first_phase)
        
        # Assert validation
        assert "can_progress" in validation
        assert "validation_results" in validation
        assert "critical_path_status" in validation
        assert "duration_status" in validation
        assert "evidence" in validation
        
        # Progress to next phase
        if validation["can_progress"]:
            result = await orchestrator.progress_to_next_phase(first_phase)
            assert result["success"] == True
            assert result["previous_phase"] == first_phase
            assert result["next_phase"] == phases[1]
            
    @pytest.mark.asyncio
    async def test_phase_validation(self, orchestrator):
        """Test phase validation"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get first phase
        phases = list(settings.BETA_PHASES.keys())
        phase = phases[0]
        
        # Start phase
        start_result = await orchestrator.start_phase(phase)
        assert start_result["success"] == True
        assert start_result["status"] == BetaPhaseStatus.IN_PROGRESS.value
        
        # Validate phase
        validation = await orchestrator.validate_phase_progression(phase)
        assert "can_progress" in validation
        assert "validation_results" in validation
        assert "critical_path_status" in validation
        
    @pytest.mark.asyncio
    async def test_critical_path_status(self, orchestrator):
        """Test critical path status retrieval"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get status
        status = await orchestrator.get_critical_path_status()
        
        # Assert
        assert status["success"] == True
        assert "phases" in status
        assert "current_phase" in status
        
        # Check each phase
        for phase, phase_status in status["phases"].items():
            assert "status" in phase_status
            assert "start_time" in phase_status
            assert "end_time" in phase_status
            assert "validation_status" in phase_status
            assert "completed_validations" in phase_status
            assert "issues" in phase_status
            
    @pytest.mark.asyncio
    async def test_phase_duration_validation(self, orchestrator):
        """Test phase duration validation"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get first phase
        phases = list(settings.BETA_PHASES.keys())
        phase = phases[0]
        
        # Start phase
        await orchestrator.start_phase(phase)
        
        # Validate duration
        duration = await orchestrator._validate_phase_duration(phase)
        
        # Assert
        assert "valid" in duration
        assert "current_duration" in duration
        assert "required_duration" in duration
        assert isinstance(duration["current_duration"], float)
        assert isinstance(duration["required_duration"], (int, float))
        
    @pytest.mark.asyncio
    async def test_requirement_validation(self, orchestrator):
        """Test requirement validation"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get first phase
        phases = list(settings.BETA_PHASES.keys())
        phase = phases[0]
        
        # Get requirements
        requirements = settings.BETA_PHASES[phase]["required_validations"]
        
        # Validate requirements
        validation = await orchestrator._validate_requirements(phase, requirements)
        
        # Assert
        assert "valid" in validation
        assert "results" in validation
        assert isinstance(validation["valid"], bool)
        assert all(req in validation["results"] for req in requirements)
        
    @pytest.mark.asyncio
    async def test_phase_initialization(self, orchestrator):
        """Test phase initialization"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get first phase
        phases = list(settings.BETA_PHASES.keys())
        phase = phases[0]
        
        # Initialize phase validations
        await orchestrator._initialize_phase_validations(phase)
        
        # Check phase data
        phase_data = orchestrator._phase_data[phase]
        assert "validations" in phase_data
        assert len(phase_data["validations"]) > 0
        
        # Check validation structure
        for validation in phase_data["validations"]:
            assert "requirement" in validation
            assert "status" in validation
            assert "timestamp" in validation
            assert validation["status"] == "pending"
            
    @pytest.mark.asyncio
    async def test_concurrent_phase_operations(self, orchestrator):
        """Test concurrent phase operations"""
        # Initialize
        await orchestrator.initialize_critical_path()
        
        # Get phases
        phases = list(settings.BETA_PHASES.keys())
        phase = phases[0]
        
        # Create concurrent operations
        async def validate_phase():
            return await orchestrator.validate_phase_progression(phase)
            
        # Run concurrent validations
        results = await asyncio.gather(*[
            validate_phase() for _ in range(5)
        ])
        
        # Assert all operations completed
        assert len(results) == 5
        assert all("can_progress" in r for r in results)
        
        # Check phase status consistency
        status = await orchestrator.get_critical_path_status()
        assert status["success"] == True
        assert status["current_phase"] == phase
