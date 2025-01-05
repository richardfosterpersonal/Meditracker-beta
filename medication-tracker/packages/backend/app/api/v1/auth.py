from fastapi import APIRouter, Depends, HTTPException, status
from app.application.services.auth_service import AuthService
from app.application.services.user_service import UserApplicationService
from app.application.dtos.user import (
    CreateUserDTO,
    LoginDTO,
    AuthResponseDTO,
    PasswordResetRequestDTO,
    PasswordResetDTO,
    EmailVerificationDTO
)
from app.api.dependencies import get_auth_service, get_user_service, get_current_user
from app.api.decorators import handle_exceptions, rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post(
    "/register",
    response_model=AuthResponseDTO,
    summary="Register a new user",
    description="""
    Register a new user account with email and password.
    An email verification link will be sent to the provided email address.
    """
)
@handle_exceptions
@rate_limit(limit=5, period=60, by_user=False)
async def register(
    data: CreateUserDTO,
    user_service: UserApplicationService = Depends(get_user_service)
):
    return await user_service.create_user(data)

@router.post(
    "/login",
    response_model=AuthResponseDTO,
    summary="Login user",
    description="Authenticate user and return JWT tokens"
)
@handle_exceptions
@rate_limit(limit=5, period=60, by_user=False)
async def login(
    data: LoginDTO,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.login(data)

@router.post(
    "/refresh-token",
    response_model=AuthResponseDTO,
    summary="Refresh access token",
    description="Get a new access token using a valid refresh token"
)
@handle_exceptions
async def refresh_token(
    current_user_id: int = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.refresh_token(current_user_id)

@router.post(
    "/request-password-reset",
    summary="Request password reset",
    description="""
    Request a password reset link. If the email exists in our system,
    a reset link will be sent to that email address.
    """
)
@handle_exceptions
@rate_limit(limit=3, period=60, by_user=False)
async def request_password_reset(
    data: PasswordResetRequestDTO,
    user_service: UserApplicationService = Depends(get_user_service)
):
    await user_service.request_password_reset(data)
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post(
    "/reset-password",
    summary="Reset password",
    description="Reset password using the token received via email"
)
@handle_exceptions
@rate_limit(limit=3, period=60, by_user=False)
async def reset_password(
    data: PasswordResetDTO,
    user_service: UserApplicationService = Depends(get_user_service)
):
    await user_service.reset_password(data)
    return {"message": "Password has been reset successfully"}

@router.post(
    "/verify-email",
    summary="Verify email address",
    description="Verify email address using the token received via email"
)
@handle_exceptions
async def verify_email(
    data: EmailVerificationDTO,
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    await user_service.verify_email(current_user_id, data)
    return {"message": "Email verified successfully"}
