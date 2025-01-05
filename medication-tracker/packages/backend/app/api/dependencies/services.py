from fastapi import Depends
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.medication_service import MedicationService
from app.infrastructure.persistence.database import get_db

def get_auth_service(db=Depends(get_db)) -> AuthService:
    return AuthService(db)

def get_user_service(db=Depends(get_db)) -> UserService:
    return UserService(db)

def get_medication_service(db=Depends(get_db)) -> MedicationService:
    return MedicationService(db)
