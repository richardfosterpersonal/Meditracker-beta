"""
A/B Testing Service Tests
Ensures compliance with SINGLE_SOURCE_VALIDATION.md
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from app.services.ab_testing_service import (
    ABTestingService,
    TestGroup,
    ExperimentType
)
from app.core.config import settings

@pytest.fixture
def ab_service():
    return ABTestingService()

@pytest.fixture
def mock_validator():
    with patch('app.validation.validation_orchestrator.ValidationOrchestrator') as mock:
        yield mock

@pytest.fixture
def mock_monitor():
    with patch('app.core.validation_monitoring.ValidationMonitor') as mock:
        yield mock

class TestABTestingService:
    """Test suite for ABTestingService"""

    async def test_get_user_group_success(
        self,
        ab_service,
        mock_validator,
        mock_monitor
    ):
        """Should assign user to test group successfully"""
        # Arrange
        user_id = "test_user"
        experiment = "safety_alerts"
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        mock_validator.validate_beta_phase.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        
        # Act
        group, result = await ab_service.get_user_group(
            user_id=user_id,
            experiment=experiment
        )
        
        # Assert
        assert result['status'] == 'success'
        assert group in [TestGroup.CONTROL, TestGroup.TEST_A, TestGroup.TEST_B]
        assert 'evidence' in result
        
        # Verify critical path validation
        mock_validator.validate_critical_path.assert_called_once_with(
            component='ab_testing',
            action='validate_safety_alerts'
        )
        
        # Verify beta phase validation
        mock_validator.validate_beta_phase.assert_called_once_with(
            feature='safety_alerts',
            user_id=user_id
        )
        
        # Verify evidence collection
        assert result['evidence']['status'] == 'complete'
        assert len(result['evidence']['validations']) == 2
        
    async def test_get_user_group_validation_failure(
        self,
        ab_service,
        mock_validator
    ):
        """Should handle validation failure"""
        # Arrange
        user_id = "test_user"
        experiment = "safety_alerts"
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'error',
            'error': 'Critical path validation failed'
        }
        
        # Act
        group, result = await ab_service.get_user_group(
            user_id=user_id,
            experiment=experiment
        )
        
        # Assert
        assert result['status'] == 'error'
        assert group == TestGroup.CONTROL
        assert 'Critical path validation failed' in result['error']
        
    async def test_track_experiment_event_success(
        self,
        ab_service,
        mock_validator
    ):
        """Should track experiment event successfully"""
        # Arrange
        user_id = "test_user"
        experiment = "safety_alerts"
        event_type = "alert_shown"
        metrics = {
            'response_time': 150,
            'user_action': 'accepted',
            'severity': 'high'
        }
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        mock_validator.validate_beta_phase.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        
        # Configure required metrics
        settings.AB_TESTING = {
            'safety_alerts': {
                'required_metrics': ['response_time', 'user_action']
            }
        }
        
        # Act
        result = await ab_service.track_experiment_event(
            user_id=user_id,
            experiment=experiment,
            event_type=event_type,
            metrics=metrics
        )
        
        # Assert
        assert result['status'] == 'success'
        assert 'evidence' in result
        assert result['evidence']['metrics'] == metrics
        
    async def test_track_experiment_event_missing_metrics(
        self,
        ab_service,
        mock_validator
    ):
        """Should handle missing required metrics"""
        # Arrange
        user_id = "test_user"
        experiment = "safety_alerts"
        event_type = "alert_shown"
        metrics = {
            'severity': 'high'  # Missing required metrics
        }
        
        settings.AB_TESTING = {
            'safety_alerts': {
                'required_metrics': ['response_time', 'user_action']
            }
        }
        
        # Act
        result = await ab_service.track_experiment_event(
            user_id=user_id,
            experiment=experiment,
            event_type=event_type,
            metrics=metrics
        )
        
        # Assert
        assert result['status'] == 'error'
        assert 'Missing required metrics' in result['error']
        
    def test_determine_group_consistency(self, ab_service):
        """Should consistently assign same user to same group"""
        # Arrange
        user_id = "test_user"
        experiment = "safety_alerts"
        
        # Act
        group1 = ab_service._determine_group(user_id, experiment)
        group2 = ab_service._determine_group(user_id, experiment)
        
        # Assert
        assert group1 == group2  # Same user should always get same group
        
    def test_determine_group_distribution(self, ab_service):
        """Should distribute users evenly across groups"""
        # Arrange
        experiment = "safety_alerts"
        user_count = 1000
        groups = {
            TestGroup.CONTROL: 0,
            TestGroup.TEST_A: 0,
            TestGroup.TEST_B: 0
        }
        
        # Act
        for i in range(user_count):
            user_id = f"user_{i}"
            group = ab_service._determine_group(user_id, experiment)
            groups[group] += 1
            
        # Assert
        # Each group should have roughly 33% of users
        for count in groups.values():
            distribution = count / user_count
            assert 0.3 <= distribution <= 0.36  # Allow some variance
