"""
Dashboard Integration Tests
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:37:30+01:00
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from pathlib import Path
import json

from app.core.dashboard_integration import (
    DashboardIntegration,
    DashboardType
)
from app.core.metrics_collector import (
    MetricsCollector,
    MetricType,
    MetricCategory
)
from app.core.validation_types import ValidationResult

@pytest.fixture
def mock_evidence_collector():
    return Mock()

@pytest.fixture
def mock_metrics_collector():
    return Mock()

@pytest.fixture
def dashboard_integration(tmp_path, mock_metrics_collector, mock_evidence_collector):
    dashboard_config_dir = tmp_path / "config/dashboards"
    return DashboardIntegration(
        metrics_collector=mock_metrics_collector,
        evidence_collector=mock_evidence_collector,
        dashboard_config_dir=str(dashboard_config_dir)
    )

@pytest.mark.asyncio
async def test_create_dashboard_success(dashboard_integration):
    """Test successful dashboard creation"""
    dashboard_name = "test_dashboard"
    dashboard_type = DashboardType.METRICS
    config = {
        "metrics": ["metric1", "metric2"],
        "refresh_interval": 60
    }
    evidence = {"source": "test"}

    result = await dashboard_integration.create_dashboard(
        dashboard_name=dashboard_name,
        dashboard_type=dashboard_type,
        config=config,
        evidence=evidence
    )

    assert result.is_valid
    assert result.timestamp is not None
    assert result.evidence["dashboard"]["name"] == dashboard_name
    assert result.evidence["dashboard"]["type"] == dashboard_type.value

    # Verify config file was created
    config_file = Path(dashboard_integration.dashboard_config_dir) / f"{dashboard_name}.json"
    assert config_file.exists()

    # Verify config content
    with open(config_file, "r") as f:
        saved_config = json.load(f)
        assert saved_config["name"] == dashboard_name
        assert saved_config["type"] == dashboard_type.value
        assert saved_config["config"] == config

@pytest.mark.asyncio
async def test_create_dashboard_invalid_config(dashboard_integration):
    """Test dashboard creation with invalid config"""
    # Test missing required config for metrics dashboard
    result = await dashboard_integration.create_dashboard(
        dashboard_name="test_dashboard",
        dashboard_type=DashboardType.METRICS,
        config={},  # Missing required 'metrics' field
        evidence={}
    )

    assert not result.is_valid
    assert "metrics" in result.error.lower()
    assert "configuration" in result.error.lower()

@pytest.mark.asyncio
async def test_create_dashboard_invalid_name(dashboard_integration):
    """Test dashboard creation with invalid name"""
    result = await dashboard_integration.create_dashboard(
        dashboard_name="",  # Empty name
        dashboard_type=DashboardType.METRICS,
        config={"metrics": []},
        evidence={}
    )

    assert not result.is_valid
    assert "name" in result.error.lower()
    assert "required" in result.error.lower()

@pytest.mark.asyncio
async def test_update_dashboard_data_metrics(dashboard_integration, mock_metrics_collector):
    """Test updating metrics dashboard data"""
    # First create a dashboard
    dashboard_name = "metrics_dashboard"
    await dashboard_integration.create_dashboard(
        dashboard_name=dashboard_name,
        dashboard_type=DashboardType.METRICS,
        config={"metrics": ["metric1"]},
        evidence={}
    )

    # Update dashboard data
    data = {
        "metric1": {
            "type": MetricType.COUNTER,
            "category": MetricCategory.PERFORMANCE,
            "value": 1.0,
            "labels": {"env": "test"}
        }
    }

    result = await dashboard_integration.update_dashboard_data(
        dashboard_name=dashboard_name,
        data=data,
        evidence={}
    )

    assert result.is_valid
    mock_metrics_collector.collect_metric.assert_called_once()

@pytest.mark.asyncio
async def test_update_dashboard_data_alerts(dashboard_integration):
    """Test updating alerts dashboard data"""
    # First create a dashboard
    dashboard_name = "alerts_dashboard"
    await dashboard_integration.create_dashboard(
        dashboard_name=dashboard_name,
        dashboard_type=DashboardType.ALERTS,
        config={"alerts": ["alert1"]},
        evidence={}
    )

    # Update dashboard data
    data = {
        "alert1": {
            "status": "active",
            "severity": "high",
            "message": "Test alert"
        }
    }

    result = await dashboard_integration.update_dashboard_data(
        dashboard_name=dashboard_name,
        data=data,
        evidence={}
    )

    assert result.is_valid
    assert "alerts_update" in result.evidence

@pytest.mark.asyncio
async def test_update_dashboard_data_audit(dashboard_integration):
    """Test updating audit dashboard data"""
    # First create a dashboard
    dashboard_name = "audit_dashboard"
    await dashboard_integration.create_dashboard(
        dashboard_name=dashboard_name,
        dashboard_type=DashboardType.AUDIT,
        config={"audit_types": ["security"]},
        evidence={}
    )

    # Update dashboard data
    data = {
        "event_type": "security",
        "action": "login",
        "user_id": "test_user"
    }

    result = await dashboard_integration.update_dashboard_data(
        dashboard_name=dashboard_name,
        data=data,
        evidence={}
    )

    assert result.is_valid
    assert "audit_update" in result.evidence

@pytest.mark.asyncio
async def test_update_nonexistent_dashboard(dashboard_integration):
    """Test updating a dashboard that doesn't exist"""
    result = await dashboard_integration.update_dashboard_data(
        dashboard_name="nonexistent",
        data={},
        evidence={}
    )

    assert not result.is_valid
    assert "not found" in result.error.lower()

@pytest.mark.asyncio
async def test_dashboard_config_persistence(tmp_path, mock_metrics_collector, mock_evidence_collector):
    """Test dashboard configuration persistence"""
    dashboard_config_dir = tmp_path / "config/dashboards"
    
    # Create first integration instance and dashboard
    integration1 = DashboardIntegration(
        metrics_collector=mock_metrics_collector,
        evidence_collector=mock_evidence_collector,
        dashboard_config_dir=str(dashboard_config_dir)
    )
    
    dashboard_name = "test_dashboard"
    await integration1.create_dashboard(
        dashboard_name=dashboard_name,
        dashboard_type=DashboardType.METRICS,
        config={"metrics": ["metric1"]},
        evidence={}
    )

    # Create second integration instance and verify dashboard exists
    integration2 = DashboardIntegration(
        metrics_collector=mock_metrics_collector,
        evidence_collector=mock_evidence_collector,
        dashboard_config_dir=str(dashboard_config_dir)
    )

    # Try to update the dashboard
    result = await integration2.update_dashboard_data(
        dashboard_name=dashboard_name,
        data={"metric1": {"value": 1.0}},
        evidence={}
    )

    assert result.is_valid
