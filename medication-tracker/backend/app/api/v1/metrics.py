"""
Metrics API Endpoints
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:41:41+01:00
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime

from app.core.metrics_collector import (
    MetricsCollector,
    MetricType,
    MetricCategory
)
from app.core.monitoring_alerts import (
    MonitoringAlerts,
    AlertSeverity,
    AlertCategory,
    AlertStatus
)
from app.core.validation_types import ValidationResult
from app.core.auth import validate_admin_token
from app.core.rate_limiter import rate_limit
from app.core.evidence_collector import EvidenceCollector

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])
security = HTTPBearer()

@router.post("/collect")
@rate_limit(max_requests=100, window_seconds=60)
async def collect_metric(
    metric_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Security(security),
    metrics_collector: MetricsCollector = Depends(),
    evidence_collector: EvidenceCollector = Depends()
) -> Dict[str, Any]:
    """
    Collect a new metric with validation and evidence
    Critical Path: Performance monitoring, HIPAA compliance
    """
    # Validate admin access
    await validate_admin_token(credentials.credentials)

    # Validate required fields
    required_fields = ["name", "type", "category", "value"]
    for field in required_fields:
        if field not in metric_data:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field: {field}"
            )

    try:
        # Convert string enums to proper types
        metric_type = MetricType(metric_data["type"])
        category = MetricCategory(metric_data["category"])
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid enum value: {str(e)}"
        )

    # Collect metric with evidence
    result = await metrics_collector.collect_metric(
        metric_name=metric_data["name"],
        metric_type=metric_type,
        category=category,
        value=metric_data["value"],
        labels=metric_data.get("labels", {}),
        evidence={
            "source": "api",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": await validate_admin_token(credentials.credentials, return_id=True)
        }
    )

    if not result.is_valid:
        raise HTTPException(
            status_code=400,
            detail=result.error
        )

    return {
        "status": "success",
        "timestamp": result.timestamp,
        "data": result.evidence
    }

@router.get("/query/{metric_name}")
@rate_limit(max_requests=100, window_seconds=60)
async def query_metric(
    metric_name: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    labels: Optional[Dict[str, str]] = None,
    credentials: HTTPAuthorizationCredentials = Security(security),
    metrics_collector: MetricsCollector = Depends()
) -> Dict[str, Any]:
    """
    Query metric data with optional filters
    Critical Path: Data access, HIPAA compliance
    """
    # Validate admin access
    await validate_admin_token(credentials.credentials)

    result = await metrics_collector.get_metric(
        metric_name=metric_name,
        start_time=start_time,
        end_time=end_time,
        labels=labels
    )

    if not result.is_valid:
        raise HTTPException(
            status_code=404 if "not found" in result.error.lower() else 400,
            detail=result.error
        )

    return {
        "status": "success",
        "timestamp": result.timestamp,
        "data": result.data
    }

@router.get("/summary")
@rate_limit(max_requests=100, window_seconds=60)
async def get_metrics_summary(
    category: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Security(security),
    metrics_collector: MetricsCollector = Depends()
) -> Dict[str, Any]:
    """
    Get summary of all metrics, optionally filtered by category
    Critical Path: Performance monitoring, business metrics
    """
    # Validate admin access
    await validate_admin_token(credentials.credentials)

    try:
        metric_category = MetricCategory(category) if category else None
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category: {str(e)}"
        )

    result = await metrics_collector.get_metrics_summary(
        category=metric_category
    )

    if not result.is_valid:
        raise HTTPException(
            status_code=400,
            detail=result.error
        )

    return {
        "status": "success",
        "timestamp": result.timestamp,
        "data": result.data
    }

@router.post("/check-alerts")
@rate_limit(max_requests=60, window_seconds=60)
async def check_metric_alerts(
    credentials: HTTPAuthorizationCredentials = Security(security),
    monitoring_alerts: MonitoringAlerts = Depends(),
    evidence_collector: EvidenceCollector = Depends()
) -> Dict[str, Any]:
    """
    Check all metric-based alerts
    Critical Path: Medication safety, system monitoring
    """
    # Validate admin access
    await validate_admin_token(credentials.credentials)

    result = await monitoring_alerts.check_metric_alerts()

    if not result.is_valid:
        raise HTTPException(
            status_code=400,
            detail=result.error
        )

    # If alerts were triggered, collect evidence
    if result.data:
        await evidence_collector.collect_evidence(
            evidence_type="metric_alerts_check",
            evidence_data={
                "triggered_alerts": result.data,
                "timestamp": result.timestamp,
                "user_id": await validate_admin_token(credentials.credentials, return_id=True)
            }
        )

    return {
        "status": "success",
        "timestamp": result.timestamp,
        "triggered_alerts": result.data
    }

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for metrics service
    Critical Path: System health monitoring
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }
