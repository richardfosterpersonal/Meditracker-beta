"""
Validation Routes
Critical Path: VALIDATION-ROUTES
Last Updated: 2025-01-02T14:13:50+01:00
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List

from ..core.unified_validation_framework import UnifiedValidationFramework
from ..models.validation import ValidationStatus, ValidationPriority, Validation

router = APIRouter()
framework = UnifiedValidationFramework()

@router.post("/validate")
async def validate(context: Dict) -> Dict:
    """Run validation with provided context"""
    try:
        result = framework.validate(context)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/validations")
async def get_validations() -> List[Dict]:
    """Get all validations"""
    try:
        return framework.get_validations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validations/{validation_id}")
async def get_validation(validation_id: str) -> Dict:
    """Get validation by ID"""
    try:
        validation = framework.get_validation(validation_id)
        if not validation:
            raise HTTPException(status_code=404, detail="Validation not found")
        return validation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validations/{validation_id}/update")
async def update_validation(validation_id: str, update: Dict) -> Dict:
    """Update validation status"""
    try:
        validation = framework.get_validation(validation_id)
        if not validation:
            raise HTTPException(status_code=404, detail="Validation not found")
            
        status = update.get("status")
        if status and status not in ValidationStatus.__members__:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        validation = framework.update_validation({
            **validation,
            **update,
            "id": validation_id
        })
        
        return validation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
