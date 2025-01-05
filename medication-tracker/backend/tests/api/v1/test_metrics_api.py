"""
Metrics API Tests
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:41:41+01:00
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.v1.metrics import router
from app.core.metrics_collector import (
    MetricsCollector,
    MetricType,
    MetricCategory
)
from app.core.monitoring_alerts import MonitoringAlerts
from app.core.validation_types import ValidationResult

# Setup test app
app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_metrics_collector():
    return Mock(spec=MetricsCollector)

@pytest.fixture
def mock_monitoring_alerts():
    return Mock(spec=MonitoringAlerts)

@pytest.fixture
def mock_evidence_collector():
    return Mock()

@pytest.fixture
def valid_admin_token():
    return "valid_admin_token"

def test_collect_metric_success(client, mock_metrics_collector, mock_evidence_collector, valid_admin_token):
    """Test successful metric collection via API"""
    # Mock successful metric collection
    mock_metrics_collector.collect_metric.return_value = ValidationResult(
        is_valid=True,
        timestamp=datetime.utcnow().isoformat(),
        evidence={"test": "data"}
    )

    # Test request
    response = client.post(
        "/api/v1/metrics/collect",
        headers={"Authorization": f"Bearer {valid_admin_token}"},
        json={
            "name": "test_metric",
            "type": "counter",
            "category": "performance",
            "value": 1.0,
            "labels": {"env": "test"}
        }
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "timestamp" in response.json()
    assert "data" in response.json()

def test_collect_metric_missing_fields(client, valid_admin_token):
    """Test metric collection with missing required fields"""
    response = client.post(
        "/api/v1/metrics/collect",
        headers={"Authorization": f"Bearer {valid_admin_token}"},
        json={
            "name": "test_metric"  # Missing required fields
        }
    )

    assert response.status_code == 400
    assert "Missing required field" in response.json()["detail"]

def test_collect_metric_invalid_enum(client, valid_admin_token):
    """Test metric collection with invalid enum values"""
    response = client.post(
        "/api/v1/metrics/collect",
        headers={"Authorization": f"Bearer {valid_admin_token}"},
        json={
            "name": "test_metric",
            "type": "invalid_type",  # Invalid enum
            "category": "performance",
            "value": 1.0
        }
    )

    assert response.status_code == 400
    assert "Invalid enum value" in response.json()["detail"]

def test_query_metric_success(client, mock_metrics_collector, valid_admin_token):
    """Test successful metric query"""
    # Mock successful metric query
    mock_metrics_collector.get_metric.return_value = ValidationResult(
        is_valid=True,
        timestamp=datetime.utcnow().isoformat(),
        data={
            "name": "test_metric",
            "values": [{"value": 1.0, "timestamp": datetime.utcnow().isoformat()}]
        }
    )

    response = client.get(
        "/api/v1/metrics/query/test_metric",
        headers={"Authorization": f"Bearer {valid_admin_token}"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "data" in response.json()
    assert "values" in response.json()["data"]

def test_query_metric_not_found(client, mock_metrics_collector, valid_admin_token):
    """Test metric query for nonexistent metric"""
    # Mock metric not found
    mock_metrics_collector.get_metric.return_value = ValidationResult(
        is_valid=False,
        error="Metric not found",
        timestamp=datetime.utcnow().isoformat()
    )

    response = client.get(
        "/api/v1/metrics/query/nonexistent",
        headers={"Authorization": f"Bearer {valid_admin_token}"}
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_get_metrics_summary_success(client, mock_metrics_collector, valid_admin_token):
    """Test successful metrics summary retrieval"""
    # Mock successful summary retrieval
    mock_metrics_collector.get_metrics_summary.return_value = ValidationResult(
        is_valid=True,
        timestamp=datetime.utcnow().isoformat(),
        data={
            "metric1": {
                "latest_value": 1.0,
                "avg_value": 0.5
            }
        }
    )

    response = client.get(
        "/api/v1/metrics/summary",
        headers={"Authorization": f"Bearer {valid_admin_token}"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "data" in response.json()

def test_get_metrics_summary_with_category(client, mock_metrics_collector, valid_admin_token):
    """Test metrics summary filtered by category"""
    # Mock successful filtered summary
    mock_metrics_collector.get_metrics_summary.return_value = ValidationResult(
        is_valid=True,
        timestamp=datetime.utcnow().isoformat(),
        data={
            "performance_metric": {
                "latest_value": 1.0,
                "avg_value": 0.5
            }
        }
    )

    response = client.get(
        "/api/v1/metrics/summary?category=performance",
        headers={"Authorization": f"Bearer {valid_admin_token}"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "data" in response.json()

def test_check_metric_alerts_success(client, mock_monitoring_alerts, mock_evidence_collector, valid_admin_token):
    """Test successful metric alerts check"""
    # Mock successful alerts check
    mock_monitoring_alerts.check_metric_alerts.return_value = ValidationResult(
        is_valid=True,
        timestamp=datetime.utcnow().isoformat(),
        data=[
            {
                "alert_name": "test_alert",
                "metric_name": "test_metric",
                "threshold": 90.0,
                "current_value": 95.0
            }
        ]
    )

    response = client.post(
        "/api/v1/metrics/check-alerts",
        headers={"Authorization": f"Bearer {valid_admin_token}"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "triggered_alerts" in response.json()
    assert len(response.json()["triggered_alerts"]) == 1

def test_unauthorized_access(client):
    """Test access without valid admin token"""
    endpoints = [
        ("POST", "/api/v1/metrics/collect"),
        ("GET", "/api/v1/metrics/query/test_metric"),
        ("GET", "/api/v1/metrics/summary"),
        ("POST", "/api/v1/metrics/check-alerts")
    ]

    for method, endpoint in endpoints:
        if method == "POST":
            response = client.post(endpoint)
        else:
            response = client.get(endpoint)
        
        assert response.status_code in [401, 403]

def test_health_check(client):
    """Test metrics service health check"""
    response = client.get("/api/v1/metrics/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "timestamp" in response.json()
