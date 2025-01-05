"""
Push Notification Sender
Handles sending push notifications via Firebase Cloud Messaging
Last Updated: 2025-01-03T22:28:16+01:00
"""

import uuid
from typing import Dict, List, Optional
from firebase_admin import messaging
from ...config.firebase_config import FirebaseConfig
from ...models.notification import NotificationStatus
from .notification_monitor import NotificationMonitor

class PushNotificationSender:
    """Firebase Cloud Messaging notification sender"""
    
    def __init__(self):
        self.firebase = FirebaseConfig()
        self.monitor = NotificationMonitor()
    
    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        priority: str = "high"
    ) -> Dict:
        """Send notification to a single device"""
        notification_id = str(uuid.uuid4())
        
        try:
            # Log notification attempt
            await self.monitor.log_notification(
                notification_id=notification_id,
                user_id="single",  # Single device notification
                title=title,
                body=body,
                tokens=[token],
                data=data,
                status=NotificationStatus.PENDING
            )
            
            # Create message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data,
                token=token,
                android=messaging.AndroidConfig(
                    priority=priority
                ),
                apns=messaging.APNSConfig(
                    headers={'apns-priority': '10' if priority == 'high' else '5'}
                )
            )
            
            # Send message
            response = messaging.send(message)
            
            # Update status
            await self.monitor.update_status(
                notification_id=notification_id,
                status=NotificationStatus.SENT,
                success_count=1
            )
            
            return {
                "notification_id": notification_id,
                "success": True,
                "message_id": response
            }
            
        except messaging.UnregisteredError:
            await self.monitor.update_status(
                notification_id=notification_id,
                status=NotificationStatus.FAILED,
                failure_count=1,
                failed_tokens=[token],
                error_details="Token is unregistered"
            )
            return {
                "notification_id": notification_id,
                "success": False,
                "error": "Token is unregistered"
            }
            
        except Exception as e:
            await self.monitor.update_status(
                notification_id=notification_id,
                status=NotificationStatus.FAILED,
                failure_count=1,
                failed_tokens=[token],
                error_details=str(e)
            )
            return {
                "notification_id": notification_id,
                "success": False,
                "error": str(e)
            }
    
    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        priority: str = "high"
    ) -> Dict:
        """Send notification to multiple devices"""
        notification_id = str(uuid.uuid4())
        
        try:
            # Log notification attempt
            await self.monitor.log_notification(
                notification_id=notification_id,
                user_id="multicast",  # Multiple device notification
                title=title,
                body=body,
                tokens=tokens,
                data=data,
                status=NotificationStatus.PENDING
            )
            
            # Create message
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data,
                tokens=tokens,
                android=messaging.AndroidConfig(
                    priority=priority
                ),
                apns=messaging.APNSConfig(
                    headers={'apns-priority': '10' if priority == 'high' else '5'}
                )
            )
            
            # Send message
            response = messaging.send_multicast(message)
            
            # Get failed tokens
            failed_tokens = [
                tokens[idx] for idx, result in enumerate(response.responses)
                if not result.success
            ]
            
            # Update status
            await self.monitor.update_status(
                notification_id=notification_id,
                status=NotificationStatus.SENT,
                success_count=response.success_count,
                failure_count=response.failure_count,
                failed_tokens=failed_tokens
            )
            
            return {
                "notification_id": notification_id,
                "success": True,
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "failed_tokens": failed_tokens
            }
            
        except Exception as e:
            await self.monitor.update_status(
                notification_id=notification_id,
                status=NotificationStatus.FAILED,
                failure_count=len(tokens),
                failed_tokens=tokens,
                error_details=str(e)
            )
            return {
                "notification_id": notification_id,
                "success": False,
                "error": str(e)
            }
    
    async def verify_token(self, token: str) -> bool:
        """Verify if a token is valid"""
        try:
            # Try to send a dry run message
            message = messaging.Message(
                notification=messaging.Notification(
                    title="Token Verification",
                    body="This is a test message"
                ),
                token=token
            )
            messaging.send(message, dry_run=True)
            return True
        except:
            return False
