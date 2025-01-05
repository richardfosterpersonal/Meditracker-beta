"""
Beta User Service Tests
Ensures compliance with SINGLE_SOURCE_VALIDATION.md
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from app.services.beta_user_service import BetaUserService, BetaFeature, BetaUserLevel
from app.core.config import settings

@pytest.fixture
def beta_service():
    return BetaUserService()

@pytest.fixture
def mock_validator():
    with patch('app.validation.validation_orchestrator.ValidationOrchestrator') as mock:
        yield mock

@pytest.fixture
def mock_monitor():
    with patch('app.core.validation_monitoring.ValidationMonitor') as mock:
        yield mock

class TestBetaUserService:
    """Test suite for BetaUserService"""

    async def test_validate_feature_access_success(
        self,
        beta_service,
        mock_validator,
        mock_monitor
    ):
        """Should validate feature access successfully"""
        # Arrange
        user_id = "test_user"
        feature = BetaFeature.MEDICATION_MANAGEMENT
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        mock_validator.validate_beta_phase.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        
        # Act
        result = await beta_service.validate_feature_access(
            user_id=user_id,
            feature=feature,
            action="read"
        )
        
        # Assert
        assert result['status'] == 'success'
        assert result['access_granted'] is True
        assert 'evidence' in result
        
        # Verify critical path validation
        mock_validator.validate_critical_path.assert_called_once_with(
            component='beta_user',
            action='validate_medication_management'
        )
        
        # Verify beta phase validation
        mock_validator.validate_beta_phase.assert_called_once_with(
            feature='medication_management',
            user_id=user_id
        )
        
        # Verify evidence collection
        assert result['evidence']['status'] == 'complete'
        assert len(result['evidence']['validations']) == 3
        
    async def test_validate_feature_access_critical_path_failure(
        self,
        beta_service,
        mock_validator
    ):
        """Should handle critical path validation failure"""
        # Arrange
        user_id = "test_user"
        feature = BetaFeature.MEDICATION_MANAGEMENT
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'error',
            'error': 'Critical path validation failed'
        }
        
        # Act
        result = await beta_service.validate_feature_access(
            user_id=user_id,
            feature=feature,
            action="read"
        )
        
        # Assert
        assert result['status'] == 'error'
        assert result['access_granted'] is False
        assert 'Critical path validation failed' in result['error']
        
    async def test_validate_feature_access_beta_failure(
        self,
        beta_service,
        mock_validator
    ):
        """Should handle beta validation failure"""
        # Arrange
        user_id = "test_user"
        feature = BetaFeature.MEDICATION_MANAGEMENT
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        mock_validator.validate_beta_phase.return_value = {
            'status': 'error',
            'error': 'Beta access validation failed'
        }
        
        # Act
        result = await beta_service.validate_feature_access(
            user_id=user_id,
            feature=feature,
            action="read"
        )
        
        # Assert
        assert result['status'] == 'error'
        assert result['access_granted'] is False
        assert 'Beta access validation failed' in result['error']
        
    async def test_validate_feature_status_disabled(
        self,
        beta_service,
        mock_validator
    ):
        """Should handle disabled features"""
        # Arrange
        user_id = "test_user"
        feature = BetaFeature.EMERGENCY_PROTOCOLS
        
        mock_validator.validate_critical_path.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        mock_validator.validate_beta_phase.return_value = {
            'status': 'success',
            'evidence': {'timestamp': datetime.utcnow().isoformat()}
        }
        
        # Simulate disabled feature
        settings.BETA_FEATURES = {
            'emergency_protocols': {'enabled': False}
        }
        
        # Act
        result = await beta_service.validate_feature_access(
            user_id=user_id,
            feature=feature,
            action="read"
        )
        
        # Assert
        assert result['status'] == 'error'
        assert result['access_granted'] is False
        assert 'Feature emergency_protocols is not enabled' in result['error']
