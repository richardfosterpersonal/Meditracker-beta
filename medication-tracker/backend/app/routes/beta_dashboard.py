"""
Beta Dashboard Routes
API endpoints for the beta testing dashboard
Last Updated: 2024-12-30T22:13:56+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from ..core.beta_dashboard import BetaDashboard

router = APIRouter(prefix="/api/beta", tags=["beta"])
dashboard = BetaDashboard()

@router.get("/summary")
async def get_dashboard_summary() -> Dict:
    """Get beta testing dashboard summary"""
    result = await dashboard.get_dashboard_summary()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
    
@router.get("/phase/{phase}")
async def get_phase_details(phase: str) -> Dict:
    """Get details for a specific phase"""
    result = await dashboard.get_phase_details(phase)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
    
@router.get("/testers")
async def get_tester_overview() -> Dict:
    """Get beta tester activity overview"""
    result = await dashboard.get_tester_overview()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
    
@router.get("/actions")
async def get_action_items() -> Dict:
    """Get pending action items"""
    result = await dashboard.get_action_items()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
