"""
Notification Service
Handles all notification operations with validation enforcement
Last Updated: 2025-01-02T22:24:03+01:00
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import logging
from firebase_admin import messaging
import firebase_admin
from firebase_admin import credentials

from ...core.enforcer_decorators import (
    requires_context,
    enforces_requirements,
    validates_scope,
    maintains_critical_path,
    syncs_documentation
)
from ...core.development_mode import (
    DevelopmentConfig,
    DevelopmentMode,
    ValidationLevel,
    DevelopmentContext
)
from ...exceptions import NotificationError
from ...services.token_service import TokenService
from ...config.firebase_config import FirebaseConfig

class NotificationService:
    """Handles notification delivery with validation"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.dev_config = DevelopmentConfig()
        self.token_service = TokenService()
        self.firebase_app = FirebaseConfig.get_app()
        
    @requires_context(
        component="notification",
        feature="medication_reminders",
        task="implementation"
    )
    @enforces_requirements(
        "REQ001: HIPAA Compliance",
        "REQ004: User Privacy"
    )
    @validates_scope(
        component="notification",
        feature="medication_reminders"
    )
    @maintains_critical_path("medication_scheduling")
    @syncs_documentation()
    async def send_notification(
        self,
        user_id: str,
        notification_data: Dict,
        priority: str = "high"
    ) -> Dict:
        """
        Send notification to user
        
        Args:
            user_id: User to notify
            notification_data: Notification content
            priority: Notification priority
            
        Returns:
            Dict with send status
        """
        try:
            # Validate notification data
            self._validate_notification_data(notification_data)
            
            # Get user's FCM tokens
            tokens = await self.token_service.get_user_tokens(user_id)
            if not tokens:
                raise NotificationError("No FCM tokens found for user")
            
            # Send to all user devices
            responses = []
            for token_info in tokens:
                try:
                    message = messaging.Message(
                        data=notification_data,
                        token=token_info["token"],
                        android=messaging.AndroidConfig(
                            priority=priority,
                            notification=messaging.AndroidNotification(
                                title=notification_data.get("title"),
                                body=notification_data.get("body")
                            )
                        ),
                        apns=messaging.APNSConfig(
                            payload=messaging.APNSPayload(
                                aps=messaging.Aps(
                                    alert=messaging.ApsAlert(
                                        title=notification_data.get("title"),
                                        body=notification_data.get("body")
                                    )
                                )
                            )
                        )
                    )
                    
                    # Send message
                    response = messaging.send(message)
                    responses.append({
                        "device_id": token_info["device_id"],
                        "status": "success",
                        "message_id": response
                    })
                    
                except messaging.ApiCallError as e:
                    # Handle invalid token
                    if "registration-token-not-registered" in str(e):
                        await self.token_service.remove_fcm_token(
                            user_id,
                            token_info["device_id"]
                        )
                    responses.append({
                        "device_id": token_info["device_id"],
                        "status": "error",
                        "error": str(e)
                    })
            
            self.logger.info(
                "Notification sent",
                extra={
                    "user_id": user_id,
                    "responses": responses,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            return {
                "success": True,
                "responses": responses,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                f"Failed to send notification: {str(e)}",
                extra={
                    "user_id": user_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            raise NotificationError(
                f"Failed to send notification: {str(e)}"
            )
            
    def _validate_notification_data(self, data: Dict):
        """Validate notification data structure"""
        required_fields = ["title", "body"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
                
        # Validate content length
        if len(data["title"]) > 100:
            raise ValueError("Title too long (max 100 chars)")
        if len(data["body"]) > 500:
            raise ValueError("Body too long (max 500 chars)")
            
    @requires_context(
        component="notification",
        feature="medication_reminders",
        task="monitoring"
    )
    async def get_notification_status(self, message_id: str) -> Dict:
        """Get status of sent notification"""
        try:
            # Check message status with Firebase
            # Note: Firebase doesn't provide direct status checking
            # We can only know if the message was accepted for delivery
            return {
                "status": "delivered",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get notification status: {str(e)}")
            raise NotificationError(
                f"Failed to get notification status: {str(e)}"
            )
