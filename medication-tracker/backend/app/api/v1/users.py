from fastapi import APIRouter, Depends, HTTPException, status
from app.application.services.user_service import UserApplicationService
from app.application.dtos.user import (
    UpdateUserDTO,
    UserResponseDTO,
    CreateCarerDTO,
    CarerResponseDTO,
    CarerAssignmentDTO,
    CarerAssignmentResponseDTO,
    ChangePasswordDTO,
    UserStatsDTO
)
from app.api.dependencies import get_user_service, get_current_user
from app.api.decorators import handle_exceptions, rate_limit

router = APIRouter(prefix="/users", tags=["users"])

@router.get(
    "/me",
    response_model=UserResponseDTO,
    summary="Get current user profile",
    description="Retrieve the profile information of the currently authenticated user"
)
@handle_exceptions
async def get_current_user_profile(
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        return await user_service.get_user_by_id(current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.put(
    "/me",
    response_model=UserResponseDTO,
    summary="Update current user profile",
    description="Update the profile information of the currently authenticated user"
)
@handle_exceptions
async def update_current_user(
    data: UpdateUserDTO,
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        return await user_service.update_user(current_user_id, data, current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post(
    "/me/change-password",
    summary="Change password",
    description="Change the password of the currently authenticated user"
)
@handle_exceptions
@rate_limit(limit=3, period=60)
async def change_password(
    data: ChangePasswordDTO,
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        await user_service.change_password(current_user_id, data)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get(
    "/me/stats",
    response_model=UserStatsDTO,
    summary="Get user statistics",
    description="""
    Get medication adherence statistics for the current user.
    Includes total medications, compliance rate, and upcoming doses.
    """
)
@handle_exceptions
async def get_user_stats(
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        return await user_service.get_user_stats(current_user_id, current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post(
    "/me/carer",
    response_model=CarerResponseDTO,
    summary="Become a carer",
    description="""
    Create a carer profile for the current user.
    This allows the user to be assigned as a carer for other users.
    """
)
@handle_exceptions
async def become_carer(
    data: CreateCarerDTO,
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    data.user_id = current_user_id
    try:
        return await user_service.create_carer(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post(
    "/me/carers",
    response_model=CarerAssignmentResponseDTO,
    summary="Assign a carer",
    description="""
    Assign a carer to the current user.
    The carer will be able to view and manage the user's medications based on permissions.
    """
)
@handle_exceptions
async def assign_carer(
    data: CarerAssignmentDTO,
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    data.patient_id = current_user_id
    try:
        return await user_service.assign_carer(data, current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get(
    "/me/carers",
    response_model=list[CarerResponseDTO],
    summary="Get my carers",
    description="Get all carers assigned to the current user"
)
@handle_exceptions
async def get_my_carers(
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        return await user_service.get_user_carers(current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get(
    "/me/patients",
    response_model=list[UserResponseDTO],
    summary="Get my patients",
    description="""
    Get all patients assigned to the current user (if user is a carer).
    This endpoint is only accessible to users with a carer profile.
    """
)
@handle_exceptions
async def get_my_patients(
    current_user_id: int = Depends(get_current_user),
    user_service: UserApplicationService = Depends(get_user_service)
):
    try:
        return await user_service.get_carer_patients(current_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
