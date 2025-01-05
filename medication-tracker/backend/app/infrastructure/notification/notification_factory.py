"""Notification factory for managing different notification senders"""

from typing import Dict, Any, List, Optional, Type, Union
from enum import Enum
import logging
from .base_sender import NotificationSender
from .email_sender import EmailSender
from .slack_sender import SlackSender
from .teams_sender import TeamsSender

class NotificationType(Enum):
    """Types of notifications that can be sent"""
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"

class NotificationFactory:
    """Factory for creating and managing notification senders"""
    
    _instance = None
    _senders: Dict[NotificationType, NotificationSender] = {}
    
    def __new__(cls):
        """Singleton pattern to ensure only one factory instance"""
        if cls._instance is None:
            cls._instance = super(NotificationFactory, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the factory if not already initialized"""
        if not self._initialized:
            self.logger = logging.getLogger(__name__)
            self._sender_classes = {
                NotificationType.EMAIL: EmailSender,
                NotificationType.SLACK: SlackSender,
                NotificationType.TEAMS: TeamsSender
            }
            self._initialized = True
    
    def get_sender(self, notification_type: Union[NotificationType, str]) -> Optional[NotificationSender]:
        """Get a notification sender instance"""
        try:
            # Convert string to enum if necessary
            if isinstance(notification_type, str):
                notification_type = NotificationType(notification_type.lower())
            
            # Create sender if it doesn't exist
            if notification_type not in self._senders:
                sender_class = self._sender_classes.get(notification_type)
                if not sender_class:
                    self.logger.error(f"Unknown notification type: {notification_type}")
                    return None
                    
                self._senders[notification_type] = sender_class()
                
            return self._senders[notification_type]
            
        except Exception as e:
            self.logger.error(f"Failed to get sender for {notification_type}: {str(e)}")
            return None
    
    async def send_notification(
        self,
        notification_type: Union[NotificationType, str],
        recipients: List[str],
        content: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Send a notification using the specified sender"""
        try:
            sender = self.get_sender(notification_type)
            if not sender:
                return {
                    "success": False,
                    "error": f"No sender available for type: {notification_type}"
                }
                
            return await sender.send_message(
                recipients=recipients,
                content=content,
                **kwargs
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send notification: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_multi_channel(
        self,
        notifications: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Send notifications through multiple channels"""
        results = []
        success = False
        
        for notification in notifications:
            try:
                notification_type = notification.pop("type", None)
                if not notification_type:
                    results.append({
                        "success": False,
                        "error": "Notification type not specified"
                    })
                    continue
                    
                result = await self.send_notification(
                    notification_type=notification_type,
                    **notification
                )
                
                results.append(result)
                if result.get("success"):
                    success = True
                    
            except Exception as e:
                results.append({
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": success,  # True if at least one notification succeeded
            "results": results
        }
    
    def register_sender(
        self,
        notification_type: NotificationType,
        sender_class: Type[NotificationSender]
    ) -> None:
        """Register a new notification sender"""
        try:
            if not issubclass(sender_class, NotificationSender):
                raise ValueError("Sender class must inherit from NotificationSender")
                
            self._sender_classes[notification_type] = sender_class
            # Remove existing instance to force recreation
            self._senders.pop(notification_type, None)
            
            self.logger.info(f"Registered sender for {notification_type}: {sender_class.__name__}")
            
        except Exception as e:
            self.logger.error(f"Failed to register sender: {str(e)}")
    
    def unregister_sender(self, notification_type: NotificationType) -> None:
        """Unregister a notification sender"""
        try:
            self._sender_classes.pop(notification_type, None)
            self._senders.pop(notification_type, None)
            self.logger.info(f"Unregistered sender for {notification_type}")
            
        except Exception as e:
            self.logger.error(f"Failed to unregister sender: {str(e)}")
