"""
Beta Process Routes
API endpoints for beta testing process enforcement
Last Updated: 2024-12-30T22:40:36+01:00
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Optional
from pydantic import BaseModel

from ..core.beta_process_enforcer import (
    BetaProcessEnforcer,
    ProcessType
)

router = APIRouter(prefix="/api/beta/process", tags=["beta"])
enforcer = BetaProcessEnforcer()

class ProcessRequest(BaseModel):
    process_type: str
    phase: str
    context: Optional[Dict] = None

@router.post("/enforce")
async def enforce_process(request: ProcessRequest) -> Dict:
    """Enforce a specific process execution"""
    try:
        # Validate process type
        try:
            process_type = ProcessType(request.process_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid process type: {request.process_type}"
            )
            
        result = await enforcer.enforce_process(
            process_type,
            request.phase,
            request.context
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Process enforcement failed: {str(e)}"
        )
        
@router.get("/verify-truth")
async def verify_single_source_of_truth() -> Dict:
    """Verify single source of truth integrity"""
    result = await enforcer.verify_single_source_of_truth()
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
        
    return result
