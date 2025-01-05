from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict
import jwt
from passlib.context import CryptContext
from app.domain.user.repositories import UserRepository
from app.application.dtos.user import (
    LoginDTO,
    AuthResponseDTO,
    RefreshTokenDTO,
    UserResponseDTO
)
from app.application.exceptions import (
    UnauthorizedError,
    ValidationError
)
from app.config import Config

class AuthService:
    def __init__(self, user_repository: UserRepository):
        self._user_repository = user_repository
        self._pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self._jwt_secret = Config.JWT_SECRET_KEY
        self._jwt_algorithm = Config.JWT_ALGORITHM
        self._access_token_expire = timedelta(hours=1)
        self._refresh_token_expire = timedelta(days=30)

    async def authenticate_user(self, dto: LoginDTO) -> AuthResponseDTO:
        """Authenticate a user and return tokens"""
        user = self._user_repository.get_by_email(dto.email)
        if not user:
            raise UnauthorizedError("Invalid credentials")

        if not self._verify_password(dto.password, user.password_hash):
            raise UnauthorizedError("Invalid credentials")

        # Update last login
        user.last_login = datetime.utcnow()
        self._user_repository.update(user)

        # Create tokens
        access_token = self._create_access_token(user.id)
        refresh_token = self._create_refresh_token(user.id)

        return AuthResponseDTO(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponseDTO(
                id=user.id,
                name=user.name,
                email=user.email,
                email_verified=user.email_verified,
                notification_preferences=user.notification_preferences,
                is_admin=user.is_admin,
                is_carer=user.is_carer,
                last_login=user.last_login,
                created_at=user.created_at,
                updated_at=user.updated_at,
                success=True
            ),
            success=True
        )

    async def refresh_token(self, dto: RefreshTokenDTO) -> AuthResponseDTO:
        """Create new access token using refresh token"""
        try:
            payload = jwt.decode(
                dto.refresh_token,
                self._jwt_secret,
                algorithms=[self._jwt_algorithm]
            )
            user_id = payload.get("sub")
            if not user_id:
                raise UnauthorizedError("Invalid refresh token")

            user = self._user_repository.get_by_id(user_id)
            if not user:
                raise UnauthorizedError("User not found")

            # Create new tokens
            access_token = self._create_access_token(user.id)
            refresh_token = self._create_refresh_token(user.id)

            return AuthResponseDTO(
                access_token=access_token,
                refresh_token=refresh_token,
                user=UserResponseDTO(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    email_verified=user.email_verified,
                    notification_preferences=user.notification_preferences,
                    is_admin=user.is_admin,
                    is_carer=user.is_carer,
                    last_login=user.last_login,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                    success=True
                ),
                success=True
            )

        except jwt.JWTError:
            raise UnauthorizedError("Invalid refresh token")

    def validate_token(self, token: str) -> Tuple[int, Dict]:
        """Validate token and return user_id and payload"""
        try:
            payload = jwt.decode(
                token,
                self._jwt_secret,
                algorithms=[self._jwt_algorithm]
            )
            user_id = payload.get("sub")
            if not user_id:
                raise UnauthorizedError("Invalid token")

            return user_id, payload

        except jwt.ExpiredSignatureError:
            raise UnauthorizedError("Token has expired")
        except jwt.JWTError:
            raise UnauthorizedError("Invalid token")

    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return self._pwd_context.hash(password)

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash"""
        return self._pwd_context.verify(plain_password, hashed_password)

    def _create_access_token(self, user_id: int) -> str:
        """Create access token"""
        expires_delta = datetime.utcnow() + self._access_token_expire
        
        to_encode = {
            "sub": str(user_id),
            "exp": expires_delta,
            "type": "access"
        }
        
        return jwt.encode(
            to_encode,
            self._jwt_secret,
            algorithm=self._jwt_algorithm
        )

    def _create_refresh_token(self, user_id: int) -> str:
        """Create refresh token"""
        expires_delta = datetime.utcnow() + self._refresh_token_expire
        
        to_encode = {
            "sub": str(user_id),
            "exp": expires_delta,
            "type": "refresh"
        }
        
        return jwt.encode(
            to_encode,
            self._jwt_secret,
            algorithm=self._jwt_algorithm
        )
