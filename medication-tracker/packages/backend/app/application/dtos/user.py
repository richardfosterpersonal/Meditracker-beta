from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from .base import BaseDTO, BaseResponseDTO
from .notification import NotificationPreferencesDTO

@dataclass
class CreateUserDTO:
    name: str = field(default="")
    email: str = field(default="")
    password: str = field(default="")
    notification_preferences: Optional[NotificationPreferencesDTO] = field(default=None)

@dataclass
class UpdateUserDTO:
    name: Optional[str] = field(default=None)
    email: Optional[str] = field(default=None)
    notification_preferences: Optional[NotificationPreferencesDTO] = field(default=None)

@dataclass
class UserResponseDTO(BaseResponseDTO):
    name: str = field(default="")
    email: str = field(default="")
    email_verified: bool = field(default=False)
    notification_preferences: NotificationPreferencesDTO = field(default_factory=NotificationPreferencesDTO)
    is_admin: bool = field(default=False)
    is_carer: bool = field(default=False)
    last_login: datetime = field(default_factory=datetime.utcnow)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class LoginDTO:
    email: str = field(default="")
    password: str = field(default="")
    device_info: Optional[Dict[str, str]] = field(default=None)

@dataclass
class AuthResponseDTO(BaseResponseDTO):
    access_token: str = field(default="")
    refresh_token: str = field(default="")
    token_type: str = field(default="Bearer")
    expires_in: int = field(default=3600)
    user: UserResponseDTO = field(default_factory=UserResponseDTO)

@dataclass
class RefreshTokenDTO:
    refresh_token: str = field(default="")

@dataclass
class PasswordResetRequestDTO:
    email: str = field(default="")

@dataclass
class PasswordResetDTO:
    token: str = field(default="")
    new_password: str = field(default="")

@dataclass
class ChangePasswordDTO:
    current_password: str = field(default="")
    new_password: str = field(default="")

@dataclass
class EmailVerificationDTO:
    token: str = field(default="")

@dataclass
class CreateCarerDTO:
    user_id: int = field(default=0)
    type: str = field(default="family")
    qualifications: Optional[Dict[str, str]] = field(default=None)

@dataclass
class CarerResponseDTO(BaseResponseDTO):
    user_id: int = field(default=0)
    type: str = field(default="family")
    verified: bool = field(default=False)
    qualifications: Optional[Dict[str, str]] = field(default=None)
    patients: List[int] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class CarerAssignmentDTO:
    carer_id: int = field(default=0)
    patient_id: int = field(default=0)
    permissions: Dict[str, bool] = field(default_factory=lambda: {
        'view_medications': True,
        'view_compliance': True,
        'receive_alerts': True,
        'emergency_contact': False,
        'modify_schedule': False
    })

@dataclass
class CarerAssignmentResponseDTO(BaseResponseDTO):
    carer_id: int = field(default=0)
    patient_id: int = field(default=0)
    permissions: Dict[str, bool] = field(default_factory=lambda: {
        'view_medications': True,
        'view_compliance': True,
        'receive_alerts': True,
        'emergency_contact': False,
        'modify_schedule': False
    })
    active: bool = field(default=True)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class UserStatsDTO:
    total_medications: int = field(default=0)
    active_medications: int = field(default=0)
    compliance_rate: float = field(default=0.0)
    last_medication_taken: Optional[datetime] = field(default=None)
    upcoming_doses: int = field(default=0)
    missed_doses: int = field(default=0)
    refills_needed: int = field(default=0)
