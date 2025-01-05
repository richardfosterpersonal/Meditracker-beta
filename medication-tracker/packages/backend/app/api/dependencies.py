from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.application.services.auth_service import AuthService
from app.application.services.user_service import UserApplicationService
from app.domain.user.repositories import UserRepository, CarerRepository
from app.infrastructure.persistence.repositories.user_repository import (
    SQLUserRepository,
    SQLCarerRepository
)
from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return SQLUserRepository(db)

def get_carer_repository(db: Session = Depends(get_db)) -> CarerRepository:
    return SQLCarerRepository(db)

def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository)
) -> AuthService:
    return AuthService(user_repository)

def get_user_service(
    user_repository: UserRepository = Depends(get_user_repository),
    carer_repository: CarerRepository = Depends(get_carer_repository),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserApplicationService:
    return UserApplicationService(
        user_repository=user_repository,
        carer_repository=carer_repository,
        auth_service=auth_service
    )

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service)
) -> Optional[int]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = auth_service.validate_token(token)
        if user_id is None:
            raise credentials_exception
        return user_id
    except Exception:
        raise credentials_exception

async def get_current_active_user(
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
) -> dict:
    user = await user_service.get_user_by_id(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
