"""
Beta Monitoring Tests
Last Updated: 2024-12-26T23:06:38+01:00
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from app.core.beta_monitoring import BetaMonitoring, MonitoringPriority
from app.core.beta_critical_path import BetaCriticalPath
from app.core.validation_metrics import ValidationMetrics

@pytest.fixture
def beta_monitoring():
    return BetaMonitoring()

@pytest.fixture
def mock_metrics():
    return {
        "user_metrics": {
            "active_time": 3600,
            "features_used": 15,
            "safety_score": 95,
            "critical_path_compliance": 98
        },
        "system_metrics": {
            "uptime": 99.9,
            "response_time": 200,
            "error_rate": 0.1
        },
        "safety_metrics": {
            "incidents": 0,
            "alerts_responded": 100,
            "compliance_score": 97
        }
    }

@pytest.fixture
def mock_user():
    return {
        "id": "test-user-1",
        "name": "Test User",
        "email": "test@example.com",
        "role": "primary_user",
        "onboarding_status": "in_progress"
    }

class TestBetaMonitoring:
    """Test suite for Beta Monitoring system"""

    @pytest.mark.asyncio
    async def test_monitor_user_activity(self, beta_monitoring, mock_user, mock_metrics):
        """Test user activity monitoring"""
        with patch('app.core.metrics_collector.MetricsCollector.collect_user_metrics',
                  return_value=mock_metrics):
            result = await beta_monitoring.monitor_user_activity(mock_user["id"])
            
            assert result["status"] == "active"
            assert "report" in result
            assert "timestamp" in result
            assert isinstance(result["timestamp"], str)
            
            # Verify report contents
            report = result["report"]
            assert report["user_id"] == mock_user["id"]
            assert "metrics" in report
            assert "critical_path" in report
            assert "safety_status" in report

    @pytest.mark.asyncio
    async def test_monitor_system_health(self, beta_monitoring, mock_metrics):
        """Test system health monitoring"""
        with patch('app.core.metrics_collector.MetricsCollector.collect_system_metrics',
                  return_value=mock_metrics):
            result = await beta_monitoring.monitor_system_health()
            
            assert result["status"] in ["healthy", "degraded"]
            assert "metrics" in result
            assert "services" in result
            assert "safety" in result
            assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_generate_safety_report(self, beta_monitoring, mock_user, mock_metrics):
        """Test safety report generation"""
        with patch('app.core.validation_metrics.ValidationMetrics.get_safety_metrics',
                  return_value=mock_metrics["safety_metrics"]):
            result = await beta_monitoring.generate_safety_report(mock_user["id"])
            
            assert result["status"] in ["compliant", "non_compliant"]
            assert "metrics" in result
            assert "critical_validation" in result
            assert "incidents" in result
            assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_monitor_critical_features(self, beta_monitoring):
        """Test critical feature monitoring"""
        result = await beta_monitoring.monitor_critical_features()
        
        assert result["status"] in ["operational", "degraded"]
        assert "features" in result
        assert "operations" in result
        assert "safety" in result
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_safety_thresholds(self, beta_monitoring, mock_metrics):
        """Test safety threshold checking"""
        result = await beta_monitoring._check_safety_thresholds(mock_metrics)
        
        assert isinstance(result, dict)
        assert "valid" in result
        assert isinstance(result["valid"], bool)

    @pytest.mark.asyncio
    async def test_incident_history(self, beta_monitoring, mock_user):
        """Test incident history checking"""
        result = await beta_monitoring._check_incident_history(mock_user["id"])
        
        assert isinstance(result, dict)
        assert "has_critical" in result
        assert isinstance(result["has_critical"], bool)

    @pytest.mark.asyncio
    async def test_feature_health(self, beta_monitoring):
        """Test feature health checking"""
        result = await beta_monitoring._check_feature_health()
        
        assert isinstance(result, dict)
        assert "healthy" in result
        assert isinstance(result["healthy"], bool)

    @pytest.mark.asyncio
    async def test_critical_operations(self, beta_monitoring):
        """Test critical operations validation"""
        result = await beta_monitoring._validate_critical_operations()
        
        assert isinstance(result, dict)
        assert "valid" in result
        assert isinstance(result["valid"], bool)

    @pytest.mark.asyncio
    async def test_safety_systems(self, beta_monitoring):
        """Test safety system checking"""
        result = await beta_monitoring._check_safety_systems()
        
        assert isinstance(result, dict)
        assert "active" in result
        assert isinstance(result["active"], bool)

class TestMonitoringIntegration:
    """Integration tests for monitoring system"""

    @pytest.mark.asyncio
    async def test_critical_path_monitoring(self, beta_monitoring, mock_user):
        """Test critical path monitoring integration"""
        # Monitor user activity
        activity = await beta_monitoring.monitor_user_activity(mock_user["id"])
        
        # Generate safety report
        safety = await beta_monitoring.generate_safety_report(mock_user["id"])
        
        # Monitor critical features
        features = await beta_monitoring.monitor_critical_features()
        
        # Verify all components work together
        assert activity["status"] == "active"
        assert safety["status"] in ["compliant", "non_compliant"]
        assert features["status"] in ["operational", "degraded"]

    @pytest.mark.asyncio
    async def test_monitoring_data_consistency(self, beta_monitoring, mock_user):
        """Test data consistency across monitoring systems"""
        # Get multiple reports
        activity = await beta_monitoring.monitor_user_activity(mock_user["id"])
        safety = await beta_monitoring.generate_safety_report(mock_user["id"])
        system = await beta_monitoring.monitor_system_health()
        
        # Verify timestamps are consistent
        activity_time = datetime.fromisoformat(activity["timestamp"])
        safety_time = datetime.fromisoformat(safety["timestamp"])
        system_time = datetime.fromisoformat(system["timestamp"])
        
        # All timestamps should be within 5 seconds
        assert abs((activity_time - safety_time).total_seconds()) < 5
        assert abs((activity_time - system_time).total_seconds()) < 5

    @pytest.mark.asyncio
    async def test_error_handling(self, beta_monitoring, mock_user):
        """Test error handling in monitoring system"""
        with patch('app.core.metrics_collector.MetricsCollector.collect_user_metrics',
                  side_effect=Exception("Test error")):
            with pytest.raises(Exception) as exc_info:
                await beta_monitoring.monitor_user_activity(mock_user["id"])
            assert "Test error" in str(exc_info.value)

class TestSafetyCompliance:
    """Test safety compliance monitoring"""

    @pytest.mark.asyncio
    async def test_safety_thresholds_validation(self, beta_monitoring, mock_metrics):
        """Test safety threshold validation"""
        # Test with valid metrics
        result = await beta_monitoring._check_safety_thresholds(mock_metrics)
        assert result["valid"] is True
        
        # Test with invalid metrics
        invalid_metrics = mock_metrics.copy()
        invalid_metrics["safety_metrics"]["compliance_score"] = 60
        result = await beta_monitoring._check_safety_thresholds(invalid_metrics)
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_critical_incident_detection(self, beta_monitoring, mock_user):
        """Test critical incident detection"""
        # Simulate incident
        with patch('app.core.critical_validation.CriticalValidation.check_incidents',
                  return_value={"has_critical": True, "count": 1}):
            result = await beta_monitoring._check_incident_history(mock_user["id"])
            assert result["has_critical"] is True

    @pytest.mark.asyncio
    async def test_safety_system_activation(self, beta_monitoring):
        """Test safety system activation"""
        # Test normal operation
        result = await beta_monitoring._check_safety_systems()
        assert result["active"] is True
        
        # Test degraded operation
        with patch('app.core.critical_validation.CriticalValidation.check_safety_systems',
                  return_value={"active": False, "reason": "Test degradation"}):
            result = await beta_monitoring._check_safety_systems()
            assert result["active"] is False
