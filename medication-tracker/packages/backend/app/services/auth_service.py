"""
Authentication Service for Medication Tracker
Last Updated: 2024-12-24T23:14:13+01:00

Critical Path: Security.Authentication
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt
from passlib.context import CryptContext
from prometheus_client import Counter

from app.core.config import settings
from app.core.monitoring import monitor, log_error
from app.services.audit_service import AuditService
from app.infrastructure.persistence.database import Database
from app.infrastructure.persistence.models.user import UserModel

# Auth Metrics
auth_events = Counter(
    'auth_events_total',
    'Total number of authentication events',
    ['event_type', 'status']
)

class AuthService:
    """
    Authentication service for user management
    Critical Path: Security.Authentication
    """
    
    def __init__(self, db: Database):
        """Initialize auth service"""
        self.db = db
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.audit_service = AuditService()
        
    @monitor(metric=auth_events)
    async def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify password hash
        Critical Path: Security.Password
        """
        try:
            is_valid = self.pwd_context.verify(plain_password, hashed_password)
            auth_events.labels(
                event_type="password_verify",
                status="success" if is_valid else "failed"
            ).inc()
            await self.audit_service.log_event(
                "password_verify",
                {"status": "success" if is_valid else "failed"}
            )
            return is_valid
        except Exception as e:
            log_error(e, {"event": "password_verify"})
            auth_events.labels(event_type="password_verify", status="error").inc()
            raise
            
    @monitor(metric=auth_events)
    async def get_password_hash(self, password: str) -> str:
        """
        Generate password hash
        Critical Path: Security.Password
        """
        try:
            hashed = self.pwd_context.hash(password)
            auth_events.labels(event_type="password_hash", status="success").inc()
            await self.audit_service.log_event(
                "password_hash",
                {"status": "success"}
            )
            return hashed
        except Exception as e:
            log_error(e, {"event": "password_hash"})
            auth_events.labels(event_type="password_hash", status="error").inc()
            raise
            
    @monitor(metric=auth_events)
    async def authenticate_user(self, username: str, password: str) -> Optional[UserModel]:
        try:
            user = self.db.session.query(UserModel).filter(UserModel.username == username).first()
            if not user:
                auth_events.labels(event_type="user_auth", status="failed").inc()
                return None
            if not await self.verify_password(password, user.password):
                auth_events.labels(event_type="user_auth", status="failed").inc()
                return None
            auth_events.labels(event_type="user_auth", status="success").inc()
            return user
        except Exception as e:
            log_error(e, {"event": "user_auth"})
            auth_events.labels(event_type="user_auth", status="error").inc()
            raise
            
    @monitor(metric=auth_events)
    async def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create JWT access token
        Critical Path: Security.Token
        """
        try:
            to_encode = data.copy()
            expire = datetime.utcnow() + (
                expires_delta if expires_delta
                else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(
                to_encode,
                settings.SECRET_KEY,
                algorithm=settings.ALGORITHM
            )
            auth_events.labels(event_type="token_create", status="success").inc()
            await self.audit_service.log_event(
                "token_create",
                {"status": "success"}
            )
            return encoded_jwt
        except Exception as e:
            log_error(e, {"event": "token_create"})
            auth_events.labels(event_type="token_create", status="error").inc()
            raise
            
    @monitor(metric=auth_events)
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token
        Critical Path: Security.Token
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            auth_events.labels(event_type="token_verify", status="success").inc()
            await self.audit_service.log_event(
                "token_verify",
                {"status": "success"}
            )
            return payload
        except jwt.JWTError as e:
            log_error(e, {"event": "token_verify"})
            auth_events.labels(event_type="token_verify", status="invalid").inc()
            return None
        except Exception as e:
            log_error(e, {"event": "token_verify"})
            auth_events.labels(event_type="token_verify", status="error").inc()
            raise