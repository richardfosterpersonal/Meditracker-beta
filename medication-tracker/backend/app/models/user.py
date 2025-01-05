from datetime import datetime, timedelta
from typing import Optional, List
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.password_policy import password_policy_service, PasswordValidationError
from app.core.encryption import get_phi_encryption
from app.core.audit import audit_logger, AuditEventType

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    name = Column(String(120), nullable=False)
    password_changed_at = Column(DateTime, default=datetime.utcnow)
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime)
    locked_until = Column(DateTime)
    medical_history = Column(Text)
    allergies = Column(Text)
    conditions = Column(Text)
    
    # Relationships
    fcm_tokens = relationship("FCMToken", back_populates="user", cascade="all, delete-orphan")

    def __init__(self, email: str, name: str):
        self.email = email
        self.name = name
        self._phi_encryption = get_phi_encryption()

    def set_password(self, password: str) -> None:
        """Set user password with policy validation"""
        try:
            # Validate password against policy
            password_policy_service.validate_password(
                password,
                str(self.id),
                None if not self.password_hash else self.password_hash
            )
            
            # Hash and set the password
            self.password_hash = generate_password_hash(password)
            self.password_changed_at = datetime.utcnow()
            
            # Add to password history
            password_policy_service.add_to_history(str(self.id), self.password_hash)
            
            # Log the event
            audit_logger.log_security_event(
                action="password_change",
                status="success",
                details={"user_email": self.email},
                user_id=str(self.id)
            )
            
        except PasswordValidationError as e:
            audit_logger.log_security_event(
                action="password_change",
                status="failed",
                details={"user_email": self.email, "reason": str(e)},
                user_id=str(self.id)
            )
            raise

    def check_password(self, password: str) -> bool:
        """Verify password and handle failed attempts"""
        if self.is_locked():
            return False

        is_valid = check_password_hash(self.password_hash, password)
        
        if not is_valid:
            self.failed_login_attempts += 1
            self.last_failed_login = datetime.utcnow()
            
            lockout_duration = password_policy_service.record_failed_attempt(str(self.id))
            if lockout_duration:
                self.locked_until = datetime.utcnow() + lockout_duration
            
            audit_logger.log_security_event(
                action="login",
                status="failed",
                details={
                    "user_email": self.email,
                    "failed_attempts": self.failed_login_attempts
                },
                user_id=str(self.id)
            )
        else:
            self.failed_login_attempts = 0
            self.last_failed_login = None
            self.locked_until = None
            password_policy_service.clear_failed_attempts(str(self.id))
            
            audit_logger.log_security_event(
                action="login",
                status="success",
                details={"user_email": self.email},
                user_id=str(self.id)
            )
        
        return is_valid

    def is_locked(self) -> bool:
        """Check if account is locked"""
        if self.locked_until and datetime.utcnow() < self.locked_until:
            return True
        return False

    def needs_password_change(self) -> bool:
        """Check if password needs to be changed"""
        return password_policy_service.check_password_age(self.password_changed_at)

    def get_medical_history(self) -> Optional[str]:
        """Get decrypted medical history"""
        if not self.medical_history:
            return None
        return self._phi_encryption.decrypt_phi({"medical_history": self.medical_history})["medical_history"]

    def set_medical_history(self, history: str) -> None:
        """Set encrypted medical history"""
        encrypted = self._phi_encryption.encrypt_phi({"medical_history": history})
        self.medical_history = encrypted["medical_history"]
        
        audit_logger.log_phi_access(
            user_id=str(self.id),
            resource="medical_history",
            action="modify",
            status="success",
            details={"operation": "update"}
        )

    def get_allergies(self) -> Optional[str]:
        """Get decrypted allergies"""
        if not self.allergies:
            return None
        return self._phi_encryption.decrypt_phi({"allergies": self.allergies})["allergies"]

    def set_allergies(self, allergies: str) -> None:
        """Set encrypted allergies"""
        encrypted = self._phi_encryption.encrypt_phi({"allergies": allergies})
        self.allergies = encrypted["allergies"]
        
        audit_logger.log_phi_access(
            user_id=str(self.id),
            resource="allergies",
            action="modify",
            status="success",
            details={"operation": "update"}
        )

    def get_conditions(self) -> Optional[str]:
        """Get decrypted conditions"""
        if not self.conditions:
            return None
        return self._phi_encryption.decrypt_phi({"conditions": self.conditions})["conditions"]

    def set_conditions(self, conditions: str) -> None:
        """Set encrypted conditions"""
        encrypted = self._phi_encryption.encrypt_phi({"conditions": conditions})
        self.conditions = encrypted["conditions"]
        
        audit_logger.log_phi_access(
            user_id=str(self.id),
            resource="conditions",
            action="modify",
            status="success",
            details={"operation": "update"}
        )