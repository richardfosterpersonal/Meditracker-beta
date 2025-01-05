"""
Token Routes
Handles FCM token management endpoints
Last Updated: 2025-01-02T22:24:03+01:00
"""

from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..services.token_service import TokenService
from ..core.auth import get_current_user
from ..exceptions import TokenError

router = APIRouter(prefix="/api/tokens", tags=["tokens"])
token_service = TokenService()

class TokenRequest(BaseModel):
    """Token registration request model"""
    token: str
    device_id: str
    platform: str

@router.post("/register")
async def register_token(
    request: TokenRequest,
    current_user = Depends(get_current_user)
):
    """Register FCM token for user"""
    try:
        result = await token_service.store_fcm_token(
            user_id=current_user.id,
            token=request.token,
            device_id=request.device_id,
            platform=request.platform
        )
        return result
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/")
async def get_tokens(current_user = Depends(get_current_user)):
    """Get all FCM tokens for user"""
    try:
        return await token_service.get_user_tokens(current_user.id)
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{device_id}")
async def remove_token(
    device_id: str,
    current_user = Depends(get_current_user)
):
    """Remove FCM token for device"""
    try:
        return await token_service.remove_fcm_token(
            current_user.id,
            device_id
        )
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/cleanup")
async def cleanup_tokens(current_user = Depends(get_current_user)):
    """Clean up invalid tokens"""
    try:
        return await token_service.cleanup_invalid_tokens(current_user.id)
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
