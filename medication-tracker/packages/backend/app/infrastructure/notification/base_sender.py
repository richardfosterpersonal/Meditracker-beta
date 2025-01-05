"""Base notification sender class"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging
import os
from datetime import datetime
import pytz

class NotificationSender(ABC):
    """Base class for notification senders"""
    
    def __init__(self):
        """Initialize the notification sender"""
        self.logger = logging.getLogger(__name__)
        
        # Load environment variables
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.app_name = os.getenv("APP_NAME", "MedicationTracker")
        
    @abstractmethod
    async def send_message(self, **kwargs) -> Dict[str, Any]:
        """Send a notification message"""
        pass
        
    def _get_current_time(self) -> str:
        """Get current time in ISO format with timezone"""
        return datetime.now(pytz.UTC).isoformat()
        
    def _format_error_response(self, error: str) -> Dict[str, Any]:
        """Format error response"""
        return {
            "success": False,
            "error": error,
            "timestamp": self._get_current_time()
        }
        
    def _format_success_response(self, **kwargs) -> Dict[str, Any]:
        """Format success response"""
        response = {
            "success": True,
            "timestamp": self._get_current_time()
        }
        response.update(kwargs)
        return response
        
    def _validate_recipients(self, recipients: List[str]) -> bool:
        """Validate recipient list"""
        return bool(recipients and all(isinstance(r, str) for r in recipients))
        
    def _validate_content(self, content: str) -> bool:
        """Validate message content"""
        return bool(content and isinstance(content, str))
        
    def _get_environment_prefix(self) -> str:
        """Get environment prefix for messages"""
        if self.environment != "production":
            return f"[{self.environment.upper()}] "
        return ""
        
    def _prepare_message(self, content: str) -> str:
        """Prepare message with environment prefix"""
        prefix = self._get_environment_prefix()
        return f"{prefix}{content}"
        
    async def _handle_send_error(self, error: Exception, context: str) -> Dict[str, Any]:
        """Handle send error with logging"""
        error_msg = f"Failed to send {context}: {str(error)}"
        self.logger.error(error_msg)
        return self._format_error_response(error_msg)
