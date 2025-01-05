"""
Beta Monitoring API Routes
Last Updated: 2024-12-26T23:09:46+01:00
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime
from ...core.beta_monitoring import BetaMonitoring
from ...core.beta_critical_path import BetaCriticalPath
from ...core.validation_metrics import ValidationMetrics
from ...services.auth_service import get_current_user
from ...domain.user.entities import User

router = APIRouter(prefix="/api/beta/monitoring", tags=["beta-monitoring"])
beta_monitoring = BetaMonitoring()
beta_critical_path = BetaCriticalPath()
validation_metrics = ValidationMetrics()

@router.get("/metrics")
async def get_monitoring_metrics(current_user: User = Depends(get_current_user)) -> Dict:
    """Get comprehensive monitoring metrics"""
    try:
        # Validate access
        if not current_user.is_beta_admin:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions for beta monitoring"
            )
            
        # Get system health
        system_health = await beta_monitoring.monitor_system_health()
        
        # Get active users
        user_metrics = await beta_monitoring.get_active_users_metrics()
        
        # Get safety metrics
        safety_metrics = await validation_metrics.get_overall_safety_metrics()
        
        # Get critical path compliance
        critical_path = await beta_critical_path.get_overall_compliance()
        
        # Get recent incidents
        incidents = await beta_monitoring.get_recent_incidents()
        
        # Get user progress
        user_progress = await beta_monitoring.get_user_progress()
        
        return {
            "userCount": user_metrics["total_users"],
            "activeUsers": user_metrics["active_users"],
            "safetyScore": safety_metrics["overall_score"],
            "criticalPathCompliance": critical_path["compliance_rate"],
            "systemHealth": system_health["status"],
            "recentIncidents": incidents,
            "userProgress": user_progress,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch monitoring metrics: {str(e)}"
        )

@router.get("/user/{user_id}")
async def get_user_metrics(
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get detailed metrics for specific user"""
    try:
        # Validate access
        if not current_user.is_beta_admin and current_user.id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to view user metrics"
            )
            
        # Get user activity
        activity = await beta_monitoring.monitor_user_activity(user_id)
        
        # Get safety report
        safety = await beta_monitoring.generate_safety_report(user_id)
        
        # Get critical path status
        critical_path = await beta_critical_path.monitor_critical_path(user_id)
        
        return {
            "activity": activity,
            "safety": safety,
            "criticalPath": critical_path,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user metrics: {str(e)}"
        )

@router.get("/safety")
async def get_safety_metrics(current_user: User = Depends(get_current_user)) -> Dict:
    """Get detailed safety metrics"""
    try:
        # Validate access
        if not current_user.is_beta_admin:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions for safety metrics"
            )
            
        # Get overall safety metrics
        overall = await validation_metrics.get_overall_safety_metrics()
        
        # Get critical features status
        features = await beta_monitoring.monitor_critical_features()
        
        # Get safety systems status
        systems = await beta_monitoring._check_safety_systems()
        
        return {
            "overallMetrics": overall,
            "criticalFeatures": features,
            "safetySystems": systems,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch safety metrics: {str(e)}"
        )

@router.get("/critical-path")
async def get_critical_path_metrics(
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get critical path compliance metrics"""
    try:
        # Validate access
        if not current_user.is_beta_admin:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions for critical path metrics"
            )
            
        # Get overall compliance
        compliance = await beta_critical_path.get_overall_compliance()
        
        # Get validation metrics
        validations = await validation_metrics.get_critical_path_validations()
        
        # Get user compliance
        user_compliance = await beta_critical_path.get_user_compliance_metrics()
        
        return {
            "overallCompliance": compliance,
            "validations": validations,
            "userCompliance": user_compliance,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch critical path metrics: {str(e)}"
        )

@router.post("/incident")
async def report_incident(
    incident: Dict,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Report a new incident"""
    try:
        # Validate incident data
        if not await beta_monitoring._validate_incident_report(incident):
            raise HTTPException(
                status_code=400,
                detail="Invalid incident report data"
            )
            
        # Check critical severity
        if incident.get("severity") == "critical":
            # Trigger immediate safety validation
            await beta_critical_path.validate_safety_emergency(incident)
            
        # Record incident
        recorded = await beta_monitoring.record_incident(incident)
        
        return {
            "status": "recorded",
            "incident_id": recorded["id"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record incident: {str(e)}"
        )

@router.get("/graduation-eligibility/{user_id}")
async def check_graduation_eligibility(
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Check if user is eligible for graduation"""
    try:
        # Validate access
        if not current_user.is_beta_admin and current_user.id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to check graduation eligibility"
            )
            
        # Check eligibility
        eligibility = await beta_critical_path.validate_graduation_criteria(user_id)
        
        return {
            "eligible": eligibility["eligible"],
            "metrics": eligibility.get("metrics", {}),
            "requirements": eligibility.get("requirements", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check graduation eligibility: {str(e)}"
        )
