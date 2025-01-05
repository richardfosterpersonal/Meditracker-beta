"""
Configuration Monitoring API
Last Updated: 2024-12-27T09:59:04+01:00
Critical Path: API.Monitoring
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from app.core.config_monitor import config_monitor
from app.core.auth import get_current_admin_user
from app.schemas.monitoring import MonitoringMetrics

router = APIRouter()

@router.get(
    "/config/health",
    response_model=MonitoringMetrics,
    dependencies=[Depends(get_current_admin_user)]
)
async def get_config_health() -> Dict:
    """
    Get configuration health metrics
    Requires admin access
    """
    try:
        metrics = await config_monitor.get_monitoring_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get configuration health metrics: {str(e)}"
        )
