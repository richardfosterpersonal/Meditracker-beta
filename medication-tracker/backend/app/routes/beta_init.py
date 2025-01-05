"""
Beta Initialization Routes
API endpoints for beta testing initialization and kickoff
Last Updated: 2024-12-30T22:49:52+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from ..core.beta_initializer import BetaInitializer

router = APIRouter(prefix="/api/beta/init", tags=["beta"])
initializer = BetaInitializer()

@router.post("/initialize")
async def initialize_beta_testing() -> Dict:
    """Initialize beta testing infrastructure"""
    result = await initializer.initialize_beta_testing()
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return result

@router.post("/kickoff/{phase}")
async def kickoff_beta_phase(phase: str) -> Dict:
    """Kickoff a new beta testing phase"""
    result = await initializer.kickoff_beta_phase(phase)
    if not result["success"]:
        raise HTTPException(
            status_code=400 if "blocking_factors" in result else 500,
            detail=result["error"]
        )
    return result
