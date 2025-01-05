"""
Test Beta Critical Path Orchestrator
Tests the beta testing critical path orchestration
Last Updated: 2024-12-31T23:16:21+01:00
"""

import pytest
from datetime import datetime
from pathlib import Path
import json
from unittest.mock import Mock, patch, PropertyMock

from app.core.beta_critical_path_orchestrator import (
    BetaCriticalPathOrchestrator,
    BetaCriticalPhase,
    BetaPhaseStatus,
    ValidationError
)

@pytest.fixture
def mock_settings():
    """Mock beta settings"""
    with patch('app.core.beta_critical_path_orchestrator.BetaSettings') as mock:
        settings = mock.return_value
        # Mock the exists() method to return True
        settings.BETA_BASE_PATH = Mock(exists=Mock(return_value=True))
        settings.EVIDENCE_PATH = Mock(exists=Mock(return_value=True))
        settings.get_phase_config.return_value = {
            "validation_rules": {
                "code_coverage": {
                    "coverage_threshold": 80,
                    "required_checks": ["unit", "integration"]
                }
            }
        }
        yield settings

@pytest.fixture
def mock_evidence():
    """Mock beta validation evidence"""
    with patch('app.core.beta_critical_path_orchestrator.BetaValidationEvidence') as mock:
        evidence = mock.return_value
        yield evidence

@pytest.fixture
def orchestrator(mock_settings, mock_evidence, tmp_path):
    """Create orchestrator instance with mocked dependencies"""
    with patch('pathlib.Path') as mock_path:
        mock_path.return_value = tmp_path
        orchestrator = BetaCriticalPathOrchestrator()
        return orchestrator

@pytest.mark.validation
@pytest.mark.critical
class TestBetaCriticalPathOrchestrator:
    """Test the Beta Critical Path Orchestrator"""

    def test_initialization_validation(self, orchestrator):
        """Test initialization validation"""
        assert orchestrator.phase_mapping["ONBOARDING"] == "internal"
        assert orchestrator.phase_mapping["DATA_SAFETY"] == "limited"
        assert orchestrator.phase_mapping["USER_EXPERIENCE"] == "open"

    def test_phase_transition_validation(self, orchestrator):
        """Test phase transition validation"""
        # Test invalid phase transition
        with pytest.raises(ValidationError):
            orchestrator.transition_phase(
                BetaCriticalPhase.DATA_SAFETY,
                BetaPhaseStatus.IN_PROGRESS
            )

        # Test valid phase transition
        orchestrator.transition_phase(
            BetaCriticalPhase.ONBOARDING,
            BetaPhaseStatus.IN_PROGRESS
        )
        assert orchestrator.get_phase_status(BetaCriticalPhase.ONBOARDING) == BetaPhaseStatus.IN_PROGRESS

    def test_evidence_collection(self, orchestrator, mock_evidence):
        """Test evidence collection during phase execution"""
        # Setup mock evidence collection
        mock_evidence.collect_validation_evidence.return_value = {
            "success": True,
            "validation_id": "test-123"
        }

        # Execute phase with evidence collection
        result = orchestrator.execute_phase(
            BetaCriticalPhase.ONBOARDING,
            {
                "code_coverage": 85,
                "test_results": "passed"
            }
        )
        assert result["status"] == "success"
        mock_evidence.collect_validation_evidence.assert_called_once()

    def test_validation_rules(self, orchestrator, mock_settings):
        """Test validation rules enforcement"""
        # Test code coverage validation
        with pytest.raises(ValidationError, match="Insufficient code coverage"):
            orchestrator.validate_phase_requirements(
                BetaCriticalPhase.ONBOARDING,
                {
                    "code_coverage": 75  # Below threshold
                }
            )

        # Test successful validation
        result = orchestrator.validate_phase_requirements(
            BetaCriticalPhase.ONBOARDING,
            {
                "code_coverage": 85  # Above threshold
            }
        )
        assert result["status"] == "success"

    def test_phase_completion_requirements(self, orchestrator):
        """Test phase completion requirements"""
        # Setup initial phase
        orchestrator.transition_phase(
            BetaCriticalPhase.ONBOARDING,
            BetaPhaseStatus.IN_PROGRESS
        )

        # Test incomplete requirements
        with pytest.raises(ValidationError):
            orchestrator.complete_phase(BetaCriticalPhase.ONBOARDING)

        # Add required evidence
        orchestrator.add_phase_evidence(
            BetaCriticalPhase.ONBOARDING,
            {
                "code_coverage": 85,
                "test_results": "passed"
            }
        )

        # Test successful completion
        result = orchestrator.complete_phase(BetaCriticalPhase.ONBOARDING)
        assert result["status"] == "completed"
        assert orchestrator.get_phase_status(BetaCriticalPhase.ONBOARDING) == BetaPhaseStatus.COMPLETED

    def test_critical_path_validation(self, orchestrator):
        """Test entire critical path validation"""
        # Test critical path sequence
        phases = [
            BetaCriticalPhase.ONBOARDING,
            BetaCriticalPhase.CORE_FEATURES,
            BetaCriticalPhase.DATA_SAFETY,
            BetaCriticalPhase.USER_EXPERIENCE
        ]

        for phase in phases:
            # Validate phase requirements
            orchestrator.validate_phase_requirements(
                phase,
                {
                    "code_coverage": 85,
                    "test_results": "passed"
                }
            )

            # Execute phase
            orchestrator.execute_phase(
                phase,
                {
                    "code_coverage": 85,
                    "test_results": "passed"
                }
            )

            # Complete phase
            orchestrator.complete_phase(phase)

        # Verify final state
        assert orchestrator.is_critical_path_complete()
        assert orchestrator.get_phase_status(BetaCriticalPhase.USER_EXPERIENCE) == BetaPhaseStatus.COMPLETED
