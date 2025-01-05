"""
Beta Critical Path Monitor Routes
API endpoints for beta testing critical path monitoring
Last Updated: 2024-12-30T22:45:43+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict
from pydantic import BaseModel

from ..core.beta_critical_path_monitor import BetaCriticalPathMonitor

router = APIRouter(prefix="/api/beta/critical-path", tags=["beta"])
monitor = BetaCriticalPathMonitor()

class PhaseTransitionRequest(BaseModel):
    current_phase: str
    next_phase: str

@router.get("/monitor/{phase}")
async def monitor_critical_path(phase: str) -> Dict:
    """Monitor critical path status and requirements"""
    result = await monitor.monitor_critical_path(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result

@router.post("/enforce/{phase}")
async def enforce_critical_path_requirements(phase: str) -> Dict:
    """Enforce critical path requirements"""
    result = await monitor.enforce_critical_path_requirements(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result

@router.post("/validate-transition")
async def validate_phase_transition(request: PhaseTransitionRequest) -> Dict:
    """Validate phase transition requirements"""
    result = await monitor.validate_phase_transition(
        request.current_phase,
        request.next_phase
    )
    if not result["success"]:
        raise HTTPException(
            status_code=400 if "blocking_factors" in result else 500,
            detail=result["error"]
        )
    return result
