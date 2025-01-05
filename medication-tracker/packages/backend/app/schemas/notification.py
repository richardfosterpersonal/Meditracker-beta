"""
Notification Schemas
Last Updated: 2024-12-25T22:41:17+01:00
Critical Path: Schemas.Notifications
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class NotificationBase(BaseModel):
    """Base notification schema"""
    user_id: int
    type: str = Field(..., description="Type of notification (email, sms, etc.)")
    title: str
    message: str
    priority: str = Field(default="normal", description="Priority level of notification")
    status: str = Field(default="pending", description="Current status of notification")

class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    pass

class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    title: Optional[str] = None
    message: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class NotificationResponse(NotificationBase):
    """Schema for notification response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        """Pydantic config"""
        from_attributes = True
