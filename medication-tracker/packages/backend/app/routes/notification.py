"""
Notification Routes
Handles notification-related endpoints
Last Updated: 2025-01-03T22:21:28+01:00
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.token import FCMToken
from ..services.token_service import TokenService
from ..infrastructure.notification.push_sender import PushNotificationSender
from ..core.auth import get_current_user
from ..models.user import User
from ..services.notification_monitor import NotificationMonitor

router = APIRouter(prefix="/notifications", tags=["notifications"])
push_sender = PushNotificationSender()

@router.post("/token")
async def register_fcm_token(
    token: str,
    device_id: str,
    platform: str,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Register FCM token for a user's device"""
    try:
        token_service = TokenService()
        await token_service.store_fcm_token(
            user_id=str(current_user.id),
            token=token,
            device_id=device_id,
            platform=platform
        )
        return {"status": "success", "message": "Token registered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/token/{device_id}")
async def remove_fcm_token(
    device_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Remove FCM token for a device"""
    try:
        token_service = TokenService()
        await token_service.remove_fcm_token(
            user_id=str(current_user.id),
            device_id=device_id
        )
        return {"status": "success", "message": "Token removed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/send")
async def send_notification(
    title: str,
    body: str,
    user_id: Optional[str] = None,
    data: Optional[Dict] = None,
    priority: str = "high",
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Send a notification to a user"""
    try:
        # If no user_id specified, send to current user
        target_user_id = user_id or str(current_user.id)
        
        # Get user's FCM tokens
        token_service = TokenService()
        tokens = await token_service.get_user_tokens(target_user_id)
        
        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered devices found for user"
            )
        
        # Send to all user's devices
        result = await push_sender.send_multicast(
            tokens=[token.token for token in tokens],
            title=title,
            body=body,
            data=data,
            priority=priority
        )
        
        # Clean up invalid tokens
        if result.get("failed_tokens"):
            await token_service.cleanup_invalid_tokens(target_user_id)
        
        return {
            "status": "success",
            "sent_count": result.get("success_count", 0),
            "failed_count": result.get("failure_count", 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/test")
async def test_notification(
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Send a test notification to the current user"""
    try:
        return await send_notification(
            title="Test Notification",
            body="This is a test notification from your medication tracker",
            data={"type": "test"},
            current_user=current_user
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/status/{notification_id}")
async def get_notification_status(
    notification_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get status of a specific notification"""
    try:
        monitor = NotificationMonitor()
        status = await monitor.get_notification_status(notification_id)
        
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
            
        return status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history")
async def get_notification_history(
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get notification history for current user"""
    try:
        monitor = NotificationMonitor()
        notifications = await monitor.get_user_notifications(
            user_id=str(current_user.id),
            limit=limit,
            skip=skip
        )
        return {"notifications": notifications}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/stats")
async def get_notification_stats(
    hours: int = 24,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get notification delivery statistics"""
    try:
        monitor = NotificationMonitor()
        stats = await monitor.get_delivery_stats(
            user_id=str(current_user.id),
            hours=hours
        )
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
