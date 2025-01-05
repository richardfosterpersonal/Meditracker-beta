"""
FCM Token Model
Represents a Firebase Cloud Messaging token
Last Updated: 2025-01-03T22:21:28+01:00
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class FCMToken(BaseModel):
    """FCM token model"""
    
    user_id: str
    device_id: str
    token: str
    platform: str
    last_updated: Optional[datetime] = None
    
    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
