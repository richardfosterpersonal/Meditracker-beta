"""
Beta Monitoring API Tests
Last Updated: 2024-12-26T23:11:31+01:00
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.api.beta.monitoring_routes import router
from app.core.beta_monitoring import BetaMonitoring
from app.core.beta_critical_path import BetaCriticalPath
from app.core.validation_metrics import ValidationMetrics
from app.domain.user.entities import User

@pytest.fixture
def client():
    return TestClient(router)

@pytest.fixture
def mock_admin_user():
    return User(
        id="admin-1",
        name="Admin User",
        email="admin@example.com",
        is_beta_admin=True
    )

@pytest.fixture
def mock_regular_user():
    return User(
        id="user-1",
        name="Regular User",
        email="user@example.com",
        is_beta_admin=False
    )

@pytest.fixture
def mock_metrics():
    return {
        "userCount": 100,
        "activeUsers": 75,
        "safetyScore": 95.5,
        "criticalPathCompliance": 98.0,
        "systemHealth": "healthy",
        "recentIncidents": [
            {
                "id": "incident-1",
                "type": "safety_alert",
                "severity": "medium",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "resolved"
            }
        ],
        "userProgress": [
            {
                "userId": "user-1",
                "name": "Test User",
                "stage": "training",
                "safetyScore": 94.0,
                "lastActive": datetime.utcnow().isoformat(),
                "criticalPathStatus": "compliant"
            }
        ]
    }

class TestMonitoringRoutes:
    """Test suite for monitoring API routes"""

    @pytest.mark.asyncio
    async def test_get_monitoring_metrics(
        self,
        client,
        mock_admin_user,
        mock_metrics
    ):
        """Test getting monitoring metrics"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            with patch('app.core.beta_monitoring.BetaMonitoring.monitor_system_health',
                      return_value={"status": "healthy"}):
                response = client.get("/api/beta/monitoring/metrics")
                
                assert response.status_code == 200
                data = response.json()
                
                assert "userCount" in data
                assert "activeUsers" in data
                assert "safetyScore" in data
                assert "criticalPathCompliance" in data
                assert "systemHealth" in data
                assert "recentIncidents" in data
                assert "userProgress" in data
                assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_monitoring_metrics_unauthorized(
        self,
        client,
        mock_regular_user
    ):
        """Test unauthorized access to monitoring metrics"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_regular_user):
            response = client.get("/api/beta/monitoring/metrics")
            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_user_metrics(
        self,
        client,
        mock_admin_user,
        mock_metrics
    ):
        """Test getting user metrics"""
        user_id = "user-1"
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            response = client.get(f"/api/beta/monitoring/user/{user_id}")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "activity" in data
            assert "safety" in data
            assert "criticalPath" in data
            assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_safety_metrics(
        self,
        client,
        mock_admin_user,
        mock_metrics
    ):
        """Test getting safety metrics"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            response = client.get("/api/beta/monitoring/safety")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "overallMetrics" in data
            assert "criticalFeatures" in data
            assert "safetySystems" in data
            assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_critical_path_metrics(
        self,
        client,
        mock_admin_user,
        mock_metrics
    ):
        """Test getting critical path metrics"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            response = client.get("/api/beta/monitoring/critical-path")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "overallCompliance" in data
            assert "validations" in data
            assert "userCompliance" in data
            assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_report_incident(self, client, mock_admin_user):
        """Test incident reporting"""
        incident_data = {
            "type": "safety_alert",
            "severity": "medium",
            "description": "Test incident",
            "user_id": "user-1"
        }
        
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            response = client.post(
                "/api/beta/monitoring/incident",
                json=incident_data
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "recorded"
            assert "incident_id" in data
            assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_report_critical_incident(self, client, mock_admin_user):
        """Test critical incident reporting"""
        incident_data = {
            "type": "safety_alert",
            "severity": "critical",
            "description": "Critical test incident",
            "user_id": "user-1"
        }
        
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            with patch('app.core.beta_critical_path.BetaCriticalPath.validate_safety_emergency',
                      return_value={"valid": True}):
                response = client.post(
                    "/api/beta/monitoring/incident",
                    json=incident_data
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert data["status"] == "recorded"
                assert "incident_id" in data
                assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_check_graduation_eligibility(
        self,
        client,
        mock_admin_user
    ):
        """Test graduation eligibility check"""
        user_id = "user-1"
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            response = client.get(
                f"/api/beta/monitoring/graduation-eligibility/{user_id}"
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "eligible" in data
            assert "metrics" in data
            assert "requirements" in data
            assert "timestamp" in data

class TestMonitoringIntegration:
    """Integration tests for monitoring system"""

    @pytest.mark.asyncio
    async def test_metrics_collection_chain(
        self,
        client,
        mock_admin_user,
        mock_metrics
    ):
        """Test complete metrics collection chain"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            # Get system metrics
            metrics_response = client.get("/api/beta/monitoring/metrics")
            assert metrics_response.status_code == 200
            
            # Get safety metrics
            safety_response = client.get("/api/beta/monitoring/safety")
            assert safety_response.status_code == 200
            
            # Get critical path metrics
            critical_response = client.get("/api/beta/monitoring/critical-path")
            assert critical_response.status_code == 200
            
            # Verify data consistency
            metrics_data = metrics_response.json()
            safety_data = safety_response.json()
            critical_data = critical_response.json()
            
            assert metrics_data["safetyScore"] == safety_data["overallMetrics"]["score"]
            assert metrics_data["criticalPathCompliance"] == critical_data["overallCompliance"]["rate"]

    @pytest.mark.asyncio
    async def test_incident_handling_chain(
        self,
        client,
        mock_admin_user
    ):
        """Test incident handling chain"""
        # Report incident
        incident_data = {
            "type": "safety_alert",
            "severity": "high",
            "description": "Test incident",
            "user_id": "user-1"
        }
        
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            # Report incident
            incident_response = client.post(
                "/api/beta/monitoring/incident",
                json=incident_data
            )
            assert incident_response.status_code == 200
            
            # Verify incident in metrics
            metrics_response = client.get("/api/beta/monitoring/metrics")
            assert metrics_response.status_code == 200
            
            metrics_data = metrics_response.json()
            incidents = metrics_data["recentIncidents"]
            
            assert any(
                i["type"] == incident_data["type"] and
                i["severity"] == incident_data["severity"]
                for i in incidents
            )

    @pytest.mark.asyncio
    async def test_error_handling(self, client, mock_admin_user):
        """Test error handling in monitoring routes"""
        with patch('app.services.auth_service.get_current_user',
                  return_value=mock_admin_user):
            with patch('app.core.beta_monitoring.BetaMonitoring.monitor_system_health',
                      side_effect=Exception("Test error")):
                response = client.get("/api/beta/monitoring/metrics")
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
