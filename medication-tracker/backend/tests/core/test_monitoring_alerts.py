"""
Monitoring Alerts Tests
Validates monitoring alerts functionality and integration
Last Updated: 2024-12-24T21:58:09+01:00
"""
import pytest
from datetime import datetime
from pathlib import Path

from app.core.monitoring_alerts import (
    MonitoringAlerts,
    AlertSeverity,
    AlertCategory,
    AlertStatus
)
from app.core.evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)
from app.core.metrics import MetricsCollector
from app.core.validation_utils import ValidationError

@pytest.fixture
def evidence_collector(tmp_path):
    evidence_dir = tmp_path / "evidence"
    return EvidenceCollector(evidence_dir=str(evidence_dir))

@pytest.fixture
def metrics_collector(tmp_path):
    metrics_dir = tmp_path / "metrics"
    return MetricsCollector(metrics_dir=str(metrics_dir))

@pytest.fixture
def alerts_dir(tmp_path):
    return tmp_path / "alerts"

@pytest.fixture
async def monitoring_alerts(alerts_dir, metrics_collector, evidence_collector):
    return MonitoringAlerts(
        metrics_collector=metrics_collector,
        evidence_collector=evidence_collector,
        alerts_dir=str(alerts_dir)
    )

@pytest.mark.asyncio
async def test_pre_validation_success(
    alerts_dir,
    metrics_collector,
    evidence_collector
):
    """Test successful pre-validation"""
    alerts_dir.mkdir(parents=True, exist_ok=True)
    
    alerts = await MonitoringAlerts(
        metrics_collector=metrics_collector,
        evidence_collector=evidence_collector,
        alerts_dir=str(alerts_dir)
    )
    
    assert alerts is not None
    
    # Verify evidence was collected
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.validation_level == ValidationLevel.HIGH
    assert evidence.data["pre_validation_type"] == "critical_path"

@pytest.mark.asyncio
async def test_pre_validation_failure(
    tmp_path,
    metrics_collector,
    evidence_collector
):
    """Test pre-validation failure with missing directory"""
    non_existent_dir = tmp_path / "does_not_exist"
    
    with pytest.raises(ValidationError) as exc_info:
        await MonitoringAlerts(
            metrics_collector=metrics_collector,
            evidence_collector=evidence_collector,
            alerts_dir=str(non_existent_dir)
        )
    
    assert "Required files not found" in str(exc_info.value)
    
    # Verify failure evidence was collected
    evidence = await evidence_collector.get_latest_evidence(
        category=EvidenceCategory.VALIDATION
    )
    assert evidence is not None
    assert evidence.data["status"] == "failure"
    assert evidence.data["pre_validation_type"] == "file_system"

@pytest.mark.asyncio
async def test_create_alert_success(monitoring_alerts):
    """Test successful alert creation"""
    alert_name = "test_alert"
    severity = AlertSeverity.HIGH
    category = AlertCategory.MEDICATION_SAFETY
    message = "Test alert message"
    metric_threshold = {"test_metric": 90.0}
    evidence = {"source": "test"}

    alert = await monitoring_alerts.create_alert(
        alert_name=alert_name,
        severity=severity,
        category=category,
        message=message,
        metric_threshold=metric_threshold,
        evidence=evidence
    )

    assert alert["name"] == alert_name
    assert alert["severity"] == severity
    assert alert["category"] == category
    assert alert["status"] == AlertStatus.ACTIVE
    assert alert["message"] == message
    assert alert["metric_threshold"] == metric_threshold
    assert "evidence_id" in alert
    assert len(alert["validation_chain"]) == 1

@pytest.mark.asyncio
async def test_update_alert_status(monitoring_alerts):
    """Test alert status update"""
    # First create an alert
    alert_name = "test_alert"
    await monitoring_alerts.create_alert(
        alert_name=alert_name,
        severity=AlertSeverity.HIGH,
        category=AlertCategory.MEDICATION_SAFETY,
        message="Test message"
    )

    # Update status
    comment = "Acknowledging alert"
    alert = await monitoring_alerts.update_alert_status(
        alert_name=alert_name,
        status=AlertStatus.ACKNOWLEDGED,
        comment=comment
    )

    assert alert["status"] == AlertStatus.ACKNOWLEDGED
    assert len(alert["validation_chain"]) == 2  # Initial + update evidence
    assert "last_comment" in alert
    assert alert["last_comment"] == comment

@pytest.mark.asyncio
async def test_update_nonexistent_alert(monitoring_alerts):
    """Test updating status of nonexistent alert"""
    with pytest.raises(ValueError, match="not found"):
        await monitoring_alerts.update_alert_status(
            alert_name="nonexistent",
            status=AlertStatus.ACKNOWLEDGED
        )

@pytest.mark.asyncio
async def test_check_metric_alerts(monitoring_alerts):
    """Test metric alerts check"""
    # Create alert with metric threshold
    alert_name = "metric_alert"
    await monitoring_alerts.create_alert(
        alert_name=alert_name,
        severity=AlertSeverity.HIGH,
        category=AlertCategory.PERFORMANCE,
        message="Metric threshold exceeded",
        metric_threshold={"test_metric": 90.0}  # Threshold lower than mock value (100.0)
    )

    triggered = await monitoring_alerts.check_metric_alerts()

    assert len(triggered) == 1
    assert triggered[0]["name"] == alert_name
    assert len(triggered[0]["validation_chain"]) == 2  # Initial + threshold breach

@pytest.mark.asyncio
async def test_get_alert_history(monitoring_alerts):
    """Test alert history retrieval with filters"""
    # Create alerts with different categories
    await monitoring_alerts.create_alert(
        alert_name="alert1",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.MEDICATION_SAFETY,
        message="Alert 1"
    )
    
    await monitoring_alerts.create_alert(
        alert_name="alert2",
        severity=AlertSeverity.MEDIUM,
        category=AlertCategory.PERFORMANCE,
        message="Alert 2"
    )

    # Update status of first alert
    await monitoring_alerts.update_alert_status(
        alert_name="alert1",
        status=AlertStatus.ACKNOWLEDGED
    )

    # Test filtering by category
    alerts = await monitoring_alerts.get_alert_history(
        category=AlertCategory.MEDICATION_SAFETY
    )
    assert len(alerts) == 1
    assert alerts[0]["name"] == "alert1"

    # Test filtering by status
    alerts = await monitoring_alerts.get_alert_history(
        status=AlertStatus.ACTIVE
    )
    assert len(alerts) == 1
    assert alerts[0]["name"] == "alert2"

    # Test with evidence chain
    alerts = await monitoring_alerts.get_alert_history(
        alert_name="alert1",
        with_evidence=True
    )
    assert len(alerts) == 1
    assert "evidence_chain" in alerts[0]
    assert len(alerts[0]["evidence_chain"]) == 2  # Initial + status update

@pytest.mark.asyncio
async def test_get_validation_summary(monitoring_alerts):
    """Test validation summary generation"""
    # Create alerts with different categories
    await monitoring_alerts.create_alert(
        alert_name="alert1",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.MEDICATION_SAFETY,
        message="Alert 1"
    )
    
    await monitoring_alerts.create_alert(
        alert_name="alert2",
        severity=AlertSeverity.MEDIUM,
        category=AlertCategory.PERFORMANCE,
        message="Alert 2"
    )

    # Update status to generate more evidence
    await monitoring_alerts.update_alert_status(
        alert_name="alert1",
        status=AlertStatus.ACKNOWLEDGED
    )

    summary = await monitoring_alerts.get_validation_summary()

    assert summary["total_alerts"] == 2
    assert summary["active_alerts"] == 1  # One acknowledged, one active
    assert "evidence_summary" in summary
    assert AlertCategory.MEDICATION_SAFETY in summary["evidence_summary"]
    assert AlertCategory.PERFORMANCE in summary["evidence_summary"]
    assert summary["evidence_summary"][AlertCategory.MEDICATION_SAFETY]["total_evidence"] == 2
    assert summary["evidence_summary"][AlertCategory.PERFORMANCE]["total_evidence"] == 1

@pytest.mark.asyncio
async def test_alerts_persistence(tmp_path, metrics_collector, evidence_collector):
    """Test alerts persistence across instances"""
    alerts_dir = tmp_path / "alerts"
    
    # Create first instance and add alert
    alerts1 = await monitoring_alerts(
        metrics_collector=metrics_collector,
        evidence_collector=evidence_collector,
        alerts_dir=str(alerts_dir)
    )
    
    await alerts1.create_alert(
        alert_name="persistent_alert",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.MEDICATION_SAFETY,
        message="Test persistence"
    )
    
    # Create second instance and verify alert exists
    alerts2 = await monitoring_alerts(
        metrics_collector=metrics_collector,
        evidence_collector=evidence_collector,
        alerts_dir=str(alerts_dir)
    )
    
    assert "persistent_alert" in alerts2.alerts
    alert = alerts2.alerts["persistent_alert"]
    assert alert["severity"] == AlertSeverity.HIGH
    assert alert["category"] == AlertCategory.MEDICATION_SAFETY
