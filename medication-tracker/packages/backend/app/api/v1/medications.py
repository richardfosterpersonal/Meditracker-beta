from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.dependencies import get_current_user
from app.api.dependencies.services import get_medication_service
from app.api.schemas.medication import MedicationCreate, MedicationUpdate, MedicationResponse
from app.infrastructure.persistence.models.user import UserModel
from app.middleware.security_validation import validate_security
from app.validation.validation_orchestrator import validate_all
from app.core.config import settings
from app.services.medication_service import MedicationService
from app.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/medications", tags=["medications"])

# Dependency
def get_medication_service(db: Session = Depends(get_db)) -> MedicationService:
    """Get medication service instance with proper validation"""
    return MedicationService(db)

@router.get("/", response_model=List[MedicationResponse])
async def get_medications(
    current_user: UserModel = Depends(get_current_user),
    medication_service: MedicationService = Depends(get_medication_service)
):
    """Get all medications for the current user"""
    return medication_service.get_user_medications(current_user.id)

@router.post("/", response_model=MedicationResponse)
@validate_all(component="medication", feature="medication_management")
@validate_security
async def create_medication(
    medication: MedicationCreate,
    current_user: UserModel = Depends(get_current_user),
    medication_service: MedicationService = Depends(get_medication_service)
) -> MedicationResponse:
    """Create a new medication with comprehensive validation"""
    return await medication_service.create_medication(current_user.id, medication)

@router.get("/{medication_id}", response_model=MedicationResponse)
@validate_all(component="medication", feature="medication_management")
async def get_medication(
    medication_id: int,
    current_user: UserModel = Depends(get_current_user),
    medication_service: MedicationService = Depends(get_medication_service)
) -> MedicationResponse:
    """Get medication details with comprehensive validation"""
    return await medication_service.get_medication(current_user.id, medication_id)

@router.put("/{medication_id}", response_model=MedicationResponse)
@validate_all(component="medication", feature="medication_management")
async def update_medication(
    medication_id: int,
    medication: MedicationUpdate,
    current_user: UserModel = Depends(get_current_user),
    medication_service: MedicationService = Depends(get_medication_service)
):
    """Update a medication"""
    existing_med = medication_service.get_medication(medication_id)
    if not existing_med or existing_med.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Medication not found")
    return medication_service.update_medication(medication_id, medication)

@router.delete("/{medication_id}")
@validate_all(component="medication", feature="medication_management")
async def delete_medication(
    medication_id: int,
    current_user: UserModel = Depends(get_current_user),
    medication_service: MedicationService = Depends(get_medication_service)
):
    """Delete a medication"""
    existing_med = medication_service.get_medication(medication_id)
    if not existing_med or existing_med.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    if medication_service.delete_medication(medication_id):
        return {"message": "Medication deleted successfully"}
    raise HTTPException(status_code=500, detail="Failed to delete medication")
