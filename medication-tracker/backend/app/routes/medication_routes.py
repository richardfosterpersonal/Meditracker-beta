from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.medication import MedicationEntry, MedicationCreate
from app.core.security import get_current_user
from app.services.medication_service import MedicationService

router = APIRouter()
medication_service = MedicationService()

@router.post("/medications/", response_model=MedicationEntry)
async def create_medication(
    medication: MedicationCreate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new medication entry
    
    Validates:
    - Medication details
    - User authorization
    - Safety constraints
    """
    try:
        return medication_service.create_medication(medication, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/medications/", response_model=List[MedicationEntry])
async def list_medications(
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve user's medication entries
    
    Ensures:
    - User-specific data
    - Secure access
    """
    return medication_service.get_user_medications(current_user)
