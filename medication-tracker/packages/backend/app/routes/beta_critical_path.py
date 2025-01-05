"""
Beta Critical Path Routes
API endpoints for beta testing critical path analysis
Last Updated: 2024-12-30T22:30:26+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from ..core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer

router = APIRouter(prefix="/api/beta/critical-path", tags=["beta"])
analyzer = BetaCriticalPathAnalyzer()

@router.get("/analyze/{phase}")
async def analyze_critical_path(phase: str) -> Dict:
    """Analyze critical path requirements for a phase"""
    result = await analyzer.analyze_critical_path(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result

@router.get("/requirements/{phase}")
async def get_critical_requirements(phase: str) -> Dict:
    """Get list of critical requirements for a phase"""
    result = await analyzer.get_critical_requirements(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result

@router.get("/validate/{phase}")
async def validate_critical_path_readiness(phase: str) -> Dict:
    """Validate if the critical path is ready for progression"""
    result = await analyzer.validate_critical_path_readiness(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result
