"""
Beta Critical Path Tests
Last Updated: 2024-12-26T23:06:38+01:00
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from app.core.beta_critical_path import BetaCriticalPath, BetaCriticalPathStatus
from app.core.validation_hook import ValidationHook
from app.core.validation_metrics import ValidationMetrics

@pytest.fixture
def beta_critical_path():
    return BetaCriticalPath()

@pytest.fixture
def mock_validation_data():
    return {
        "user_id": "test-user-1",
        "step": "medication_setup",
        "data": {
            "medications": [
                {
                    "name": "Test Med",
                    "dosage": "10mg",
                    "frequency": "daily",
                    "time": "08:00"
                }
            ],
            "safety_checks": {
                "interactions_verified": True,
                "dosage_verified": True
            }
        }
    }

@pytest.fixture
def mock_metrics():
    return {
        "validation_count": 10,
        "success_rate": 95,
        "safety_score": 98,
        "critical_compliance": 100
    }

class TestBetaCriticalPath:
    """Test suite for Beta Critical Path validation"""

    @pytest.mark.asyncio
    async def test_validate_onboarding_step(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test onboarding step validation"""
        result = await beta_critical_path.validate_onboarding_step(
            mock_validation_data["user_id"],
            mock_validation_data["step"],
            mock_validation_data["data"]
        )
        
        assert "status" in result
        assert "validation_id" in result
        assert "timestamp" in result
        assert "metrics" in result
        
        assert result["status"] == "success"
        assert isinstance(result["validation_id"], str)
        assert isinstance(result["timestamp"], str)

    @pytest.mark.asyncio
    async def test_monitor_critical_path(self, beta_critical_path, mock_validation_data):
        """Test critical path monitoring"""
        result = await beta_critical_path.monitor_critical_path(
            mock_validation_data["user_id"]
        )
        
        assert "status" in result
        assert "metrics" in result
        assert "safety_metrics" in result
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_validate_graduation_criteria(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test graduation criteria validation"""
        result = await beta_critical_path.validate_graduation_criteria(
            mock_validation_data["user_id"]
        )
        
        assert "eligible" in result
        assert isinstance(result["eligible"], bool)
        if not result["eligible"]:
            assert "reason" in result
            assert "details" in result

    @pytest.mark.asyncio
    async def test_safety_requirements(self, beta_critical_path, mock_validation_data):
        """Test safety requirements validation"""
        result = await beta_critical_path._validate_safety_requirements(
            mock_validation_data["data"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)

    @pytest.mark.asyncio
    async def test_data_integrity(self, beta_critical_path, mock_validation_data):
        """Test data integrity validation"""
        result = await beta_critical_path._validate_data_integrity(
            mock_validation_data["data"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)

    @pytest.mark.asyncio
    async def test_critical_path_alignment(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test critical path alignment validation"""
        result = await beta_critical_path._validate_critical_path_alignment(
            mock_validation_data["step"],
            mock_validation_data["data"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)

class TestCriticalPathIntegration:
    """Integration tests for critical path validation"""

    @pytest.mark.asyncio
    async def test_validation_chain(self, beta_critical_path, mock_validation_data):
        """Test complete validation chain"""
        # Validate onboarding step
        step_result = await beta_critical_path.validate_onboarding_step(
            mock_validation_data["user_id"],
            mock_validation_data["step"],
            mock_validation_data["data"]
        )
        assert step_result["status"] == "success"
        
        # Monitor critical path
        monitor_result = await beta_critical_path.monitor_critical_path(
            mock_validation_data["user_id"]
        )
        assert "status" in monitor_result
        
        # Check graduation eligibility
        grad_result = await beta_critical_path.validate_graduation_criteria(
            mock_validation_data["user_id"]
        )
        assert "eligible" in grad_result

    @pytest.mark.asyncio
    async def test_validation_failure_handling(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test handling of validation failures"""
        # Modify data to trigger failure
        invalid_data = mock_validation_data.copy()
        invalid_data["data"]["safety_checks"]["interactions_verified"] = False
        
        result = await beta_critical_path.validate_onboarding_step(
            invalid_data["user_id"],
            invalid_data["step"],
            invalid_data["data"]
        )
        
        assert result["status"] == "failed"
        assert "reason" in result
        assert "details" in result

    @pytest.mark.asyncio
    async def test_metrics_collection(self, beta_critical_path, mock_validation_data):
        """Test metrics collection during validation"""
        # Perform validation
        result = await beta_critical_path.validate_onboarding_step(
            mock_validation_data["user_id"],
            mock_validation_data["step"],
            mock_validation_data["data"]
        )
        
        # Verify metrics
        assert "metrics" in result
        metrics = result["metrics"]
        assert isinstance(metrics, dict)
        assert all(key in metrics for key in [
            "validation_count",
            "success_rate",
            "safety_score"
        ])

class TestSafetyValidation:
    """Test safety validation components"""

    @pytest.mark.asyncio
    async def test_safety_requirements_validation(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test detailed safety requirements validation"""
        result = await beta_critical_path._validate_safety_requirements(
            mock_validation_data["data"]
        )
        
        assert result["valid"] is True
        assert "details" in result
        
        # Test with invalid safety data
        invalid_data = mock_validation_data["data"].copy()
        invalid_data["safety_checks"]["interactions_verified"] = False
        result = await beta_critical_path._validate_safety_requirements(invalid_data)
        assert result["valid"] is False
        assert "details" in result

    @pytest.mark.asyncio
    async def test_critical_requirements(self, beta_critical_path, mock_validation_data):
        """Test critical requirements validation"""
        result = await beta_critical_path._check_critical_requirements(
            mock_validation_data["user_id"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)
        if not result["valid"]:
            assert "details" in result

    @pytest.mark.asyncio
    async def test_safety_requirements_check(
        self,
        beta_critical_path,
        mock_validation_data
    ):
        """Test safety requirements check"""
        result = await beta_critical_path._check_safety_requirements(
            mock_validation_data["user_id"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)
        if not result["valid"]:
            assert "details" in result

    @pytest.mark.asyncio
    async def test_usage_requirements(self, beta_critical_path, mock_validation_data):
        """Test usage requirements validation"""
        result = await beta_critical_path._check_usage_requirements(
            mock_validation_data["user_id"]
        )
        
        assert "valid" in result
        assert isinstance(result["valid"], bool)
        if not result["valid"]:
            assert "details" in result
