"""
Monitoring Alerts Integration Tests
Validates integration with evidence collection and metrics
Last Updated: 2024-12-24T21:53:31+01:00
"""
import pytest
from datetime import datetime, timedelta
from pathlib import Path

from app.core.monitoring_alerts import (
    MonitoringAlerts,
    AlertSeverity,
    AlertCategory,
    AlertStatus
)
from app.core.evidence_collector import EvidenceCollector
from app.core.metrics import MetricsCollector

@pytest.fixture
def metrics_collector(tmp_path):
    metrics_dir = tmp_path / "metrics"
    return MetricsCollector(metrics_dir=str(metrics_dir))

@pytest.fixture
def evidence_collector(tmp_path):
    evidence_dir = tmp_path / "evidence"
    return EvidenceCollector(evidence_dir=str(evidence_dir))

@pytest.fixture
def monitoring_alerts(tmp_path, metrics_collector, evidence_collector):
    alerts_dir = tmp_path / "alerts"
    return MonitoringAlerts(
        metrics_collector=metrics_collector,
        evidence_collector=evidence_collector,
        alerts_dir=str(alerts_dir)
    )

@pytest.mark.asyncio
async def test_alert_creation_with_evidence(monitoring_alerts, evidence_collector):
    """Test alert creation with evidence collection"""
    # Create alert
    alert = await monitoring_alerts.create_alert(
        alert_name="test_med_alert",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.MEDICATION_SAFETY,
        message="High priority medication alert",
        metric_threshold={"med_error_rate": 5.0},
        evidence={
            "medication_id": "med_123",
            "error_type": "dosage",
            "current_value": 7.5
        }
    )

    # Verify alert was created
    assert alert["name"] == "test_med_alert"
    assert alert["severity"] == AlertSeverity.HIGH
    assert alert["category"] == AlertCategory.MEDICATION_SAFETY
    
    # Verify evidence was collected
    evidence = await evidence_collector.get_evidence(alert["evidence_id"])
    assert evidence is not None
    assert evidence.category == "medication_safety"
    assert evidence.validation_level == "high"
    assert "medication_id" in evidence.data["custom_evidence"]

@pytest.mark.asyncio
async def test_alert_status_update_chain(monitoring_alerts, evidence_collector):
    """Test alert status updates create evidence chain"""
    # Create initial alert
    alert = await monitoring_alerts.create_alert(
        alert_name="chain_test",
        severity=AlertSeverity.CRITICAL,
        category=AlertCategory.DATA_SECURITY,
        message="Security breach detected"
    )
    
    initial_evidence_id = alert["evidence_id"]
    
    # Update status multiple times
    statuses = [
        (AlertStatus.ACKNOWLEDGED, "Initial review"),
        (AlertStatus.RESOLVED, "Issue fixed"),
        (AlertStatus.SILENCED, "Confirmed resolution")
    ]
    
    for status, comment in statuses:
        alert = await monitoring_alerts.update_alert_status(
            alert_name="chain_test",
            status=status,
            comment=comment
        )
    
    # Verify evidence chain
    assert len(alert["validation_chain"]) == 4  # Initial + 3 updates
    
    # Verify each evidence entry
    for evidence_id in alert["validation_chain"]:
        evidence = await evidence_collector.get_evidence(evidence_id)
        assert evidence is not None
        assert evidence.category == "data_security"
        assert evidence.validation_level == "critical"

@pytest.mark.asyncio
async def test_metric_threshold_monitoring(
    monitoring_alerts,
    metrics_collector,
    evidence_collector
):
    """Test metric monitoring with evidence collection"""
    # Set up test metrics
    await metrics_collector.record_metric(
        "system_cpu",
        85.0,
        {"component": "api_server"}
    )
    
    # Create alert with threshold
    alert = await monitoring_alerts.create_alert(
        alert_name="cpu_alert",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.PERFORMANCE,
        message="High CPU usage detected",
        metric_threshold={"system_cpu": 80.0}
    )
    
    # Check metrics
    triggered = await monitoring_alerts.check_metric_alerts()
    
    # Verify alert was triggered
    assert len(triggered) == 1
    triggered_alert = triggered[0]
    assert triggered_alert["name"] == "cpu_alert"
    
    # Verify evidence chain
    assert len(triggered_alert["validation_chain"]) == 2  # Initial + threshold breach
    
    # Verify threshold breach evidence
    breach_evidence = await evidence_collector.get_evidence(
        triggered_alert["validation_chain"][-1]
    )
    assert breach_evidence is not None
    assert breach_evidence.category == "performance"
    assert "threshold" in breach_evidence.data
    assert breach_evidence.data["current_value"] > breach_evidence.data["threshold"]

@pytest.mark.asyncio
async def test_alert_history_with_evidence(
    monitoring_alerts,
    evidence_collector
):
    """Test alert history retrieval with evidence chain"""
    # Create alerts for different categories
    alerts_data = [
        {
            "name": "med_alert_1",
            "severity": AlertSeverity.HIGH,
            "category": AlertCategory.MEDICATION_SAFETY,
            "message": "Medication interaction detected"
        },
        {
            "name": "security_alert_1",
            "severity": AlertSeverity.CRITICAL,
            "category": AlertCategory.DATA_SECURITY,
            "message": "Unauthorized access attempt"
        }
    ]
    
    for data in alerts_data:
        await monitoring_alerts.create_alert(**data)
    
    # Update status of first alert
    await monitoring_alerts.update_alert_status(
        alert_name="med_alert_1",
        status=AlertStatus.ACKNOWLEDGED,
        comment="Under review"
    )
    
    # Get history with evidence
    history = await monitoring_alerts.get_alert_history(with_evidence=True)
    
    # Verify history
    assert len(history) == 2
    
    # Check med_alert_1
    med_alert = next(a for a in history if a["name"] == "med_alert_1")
    assert len(med_alert["evidence_chain"]) == 2  # Initial + status update
    assert med_alert["status"] == AlertStatus.ACKNOWLEDGED
    
    # Check security_alert_1
    sec_alert = next(a for a in history if a["name"] == "security_alert_1")
    assert len(sec_alert["evidence_chain"]) == 1  # Just initial
    assert sec_alert["status"] == AlertStatus.ACTIVE

@pytest.mark.asyncio
async def test_validation_summary_integration(
    monitoring_alerts,
    evidence_collector
):
    """Test validation summary with evidence integration"""
    # Create alerts with different categories
    categories = [
        (AlertCategory.MEDICATION_SAFETY, AlertSeverity.HIGH),
        (AlertCategory.DATA_SECURITY, AlertSeverity.CRITICAL),
        (AlertCategory.PERFORMANCE, AlertSeverity.MEDIUM)
    ]
    
    for i, (category, severity) in enumerate(categories):
        await monitoring_alerts.create_alert(
            alert_name=f"alert_{i}",
            severity=severity,
            category=category,
            message=f"Test alert {i}"
        )
    
    # Update statuses to generate more evidence
    await monitoring_alerts.update_alert_status(
        alert_name="alert_0",
        status=AlertStatus.ACKNOWLEDGED
    )
    
    await monitoring_alerts.update_alert_status(
        alert_name="alert_1",
        status=AlertStatus.RESOLVED
    )
    
    # Get summary
    summary = await monitoring_alerts.get_validation_summary()
    
    # Verify summary
    assert summary["total_alerts"] == 3
    assert summary["active_alerts"] == 1  # One still active
    
    # Verify evidence summary
    evidence_summary = summary["evidence_summary"]
    assert evidence_summary[AlertCategory.MEDICATION_SAFETY]["total_evidence"] == 2
    assert evidence_summary[AlertCategory.DATA_SECURITY]["total_evidence"] == 2
    assert evidence_summary[AlertCategory.PERFORMANCE]["total_evidence"] == 1
