"""
Dashboard Configuration Tests
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:45:10+01:00
"""
import pytest
from datetime import datetime
from typing import Dict, Any

from app.core.dashboard_config import (
    DashboardService,
    DashboardConfig,
    DashboardPanel,
    DashboardMetric,
    DashboardType,
    MetricDisplay,
    ValidationLevel
)

@pytest.fixture
def dashboard_service():
    return DashboardService()

@pytest.fixture
def valid_metric_config() -> Dict[str, Any]:
    return {
        "name": "test_metric",
        "display_type": MetricDisplay.LINE,
        "validation_level": ValidationLevel.HIGH,
        "refresh_interval": 60,
        "labels": {"env": "test"}
    }

@pytest.fixture
def valid_panel_config(valid_metric_config) -> Dict[str, Any]:
    return {
        "title": "Test Panel",
        "description": "Test panel description",
        "metrics": [valid_metric_config],
        "validation_level": ValidationLevel.HIGH,
        "layout": {"x": 0, "y": 0, "w": 6, "h": 4}
    }

@pytest.fixture
def valid_dashboard_config(valid_panel_config) -> Dict[str, Any]:
    return {
        "id": "test-dashboard",
        "name": "Test Dashboard",
        "type": DashboardType.MEDICATION_SAFETY,
        "description": "Test dashboard description",
        "panels": [valid_panel_config],
        "validation_level": ValidationLevel.HIGH,
        "refresh_interval": 300
    }

@pytest.fixture
def medication_safety_config(valid_panel_config) -> Dict[str, Any]:
    """Configuration meeting medication safety requirements"""
    metrics = [
        {
            "name": metric_name,
            "display_type": MetricDisplay.LINE,
            "validation_level": ValidationLevel.CRITICAL,
            "refresh_interval": 60,
            "labels": {"type": "safety"}
        }
        for metric_name in [
            "medication_errors",
            "prescription_validation_rate",
            "alert_response_time"
        ]
    ]

    panel = valid_panel_config.copy()
    panel["metrics"] = metrics

    config = valid_dashboard_config.copy()
    config["type"] = DashboardType.MEDICATION_SAFETY
    config["panels"] = [panel]
    config["validation_level"] = ValidationLevel.CRITICAL

    return config

@pytest.mark.asyncio
async def test_create_dashboard_success(
    dashboard_service,
    valid_dashboard_config
):
    """Test successful dashboard creation"""
    dashboard = await dashboard_service.create_dashboard(
        valid_dashboard_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    
    assert dashboard.id == valid_dashboard_config["id"]
    assert dashboard.name == valid_dashboard_config["name"]
    assert dashboard.type == valid_dashboard_config["type"]

@pytest.mark.asyncio
async def test_create_medication_safety_dashboard(
    dashboard_service,
    medication_safety_config
):
    """Test creation of medication safety dashboard"""
    dashboard = await dashboard_service.create_dashboard(
        medication_safety_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    
    assert dashboard.validate_critical_path()
    assert dashboard.type == DashboardType.MEDICATION_SAFETY

@pytest.mark.asyncio
async def test_update_dashboard_success(
    dashboard_service,
    valid_dashboard_config
):
    """Test successful dashboard update"""
    # Create initial dashboard
    dashboard = await dashboard_service.create_dashboard(
        valid_dashboard_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )

    # Update dashboard
    updated_config = valid_dashboard_config.copy()
    updated_config["name"] = "Updated Dashboard"
    
    updated = await dashboard_service.update_dashboard(
        dashboard.id,
        updated_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    
    assert updated.name == "Updated Dashboard"

@pytest.mark.asyncio
async def test_get_dashboard(dashboard_service, valid_dashboard_config):
    """Test dashboard retrieval"""
    # Create dashboard
    await dashboard_service.create_dashboard(
        valid_dashboard_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )

    # Get dashboard
    dashboard = await dashboard_service.get_dashboard(
        valid_dashboard_config["id"]
    )
    
    assert dashboard is not None
    assert dashboard.id == valid_dashboard_config["id"]

@pytest.mark.asyncio
async def test_list_dashboards_by_type(
    dashboard_service,
    valid_dashboard_config,
    medication_safety_config
):
    """Test dashboard listing by type"""
    # Create dashboards
    await dashboard_service.create_dashboard(
        valid_dashboard_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    await dashboard_service.create_dashboard(
        medication_safety_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )

    # List medication safety dashboards
    dashboards = await dashboard_service.list_dashboards(
        DashboardType.MEDICATION_SAFETY
    )
    
    assert len(dashboards) == 1
    assert dashboards[0].type == DashboardType.MEDICATION_SAFETY

@pytest.mark.asyncio
async def test_delete_dashboard(dashboard_service, valid_dashboard_config):
    """Test dashboard deletion"""
    # Create dashboard
    await dashboard_service.create_dashboard(
        valid_dashboard_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )

    # Delete dashboard
    success = await dashboard_service.delete_dashboard(
        valid_dashboard_config["id"],
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    
    assert success
    dashboard = await dashboard_service.get_dashboard(
        valid_dashboard_config["id"]
    )
    assert dashboard is None

@pytest.mark.asyncio
async def test_validation_critical_path(dashboard_service):
    """Test critical path validation for different dashboard types"""
    # Test medication safety dashboard without required metrics
    invalid_config = valid_dashboard_config.copy()
    invalid_config["type"] = DashboardType.MEDICATION_SAFETY

    with pytest.raises(ValueError, match="critical path requirements"):
        await dashboard_service.create_dashboard(
            invalid_config,
            evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
        )

    # Test with valid medication safety config
    dashboard = await dashboard_service.create_dashboard(
        medication_safety_config,
        evidence={"user_id": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    assert dashboard.validate_critical_path()

@pytest.mark.asyncio
async def test_dashboard_metric_validation():
    """Test dashboard metric validation"""
    # Test invalid metric name
    with pytest.raises(ValueError):
        DashboardMetric(
            name="",
            display_type=MetricDisplay.LINE,
            validation_level=ValidationLevel.HIGH
        )

    # Test invalid refresh interval
    with pytest.raises(ValueError):
        DashboardMetric(
            name="test",
            display_type=MetricDisplay.LINE,
            validation_level=ValidationLevel.HIGH,
            refresh_interval=10  # Too low
        )

@pytest.mark.asyncio
async def test_dashboard_panel_validation():
    """Test dashboard panel validation"""
    # Test empty metrics list
    with pytest.raises(ValueError):
        DashboardPanel(
            title="Test",
            description="Test",
            metrics=[],
            validation_level=ValidationLevel.HIGH,
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    # Test too many metrics
    metrics = [
        DashboardMetric(
            name=f"metric_{i}",
            display_type=MetricDisplay.LINE,
            validation_level=ValidationLevel.HIGH
        )
        for i in range(11)  # More than allowed
    ]
    
    with pytest.raises(ValueError):
        DashboardPanel(
            title="Test",
            description="Test",
            metrics=metrics,
            validation_level=ValidationLevel.HIGH,
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )
