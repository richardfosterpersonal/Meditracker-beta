"""
Token Service
Handles FCM token management
Last Updated: 2025-01-03T22:21:28+01:00
"""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from ..models.token import FCMToken
from ..core.config import get_database_url
from ..exceptions import TokenError

class TokenService:
    """Service for managing FCM tokens"""
    
    def __init__(self):
        self.client = AsyncIOMotorClient(get_database_url())
        self.db = self.client.medication_tracker
        self.collection = self.db.fcm_tokens
    
    async def store_fcm_token(
        self,
        user_id: str,
        token: str,
        device_id: str,
        platform: str
    ) -> None:
        """Store or update FCM token for a device"""
        try:
            await self.collection.update_one(
                {"user_id": user_id, "device_id": device_id},
                {
                    "$set": {
                        "token": token,
                        "platform": platform,
                        "last_updated": datetime.utcnow()
                    }
                },
                upsert=True
            )
        except Exception as e:
            raise TokenError(f"Failed to store FCM token: {str(e)}")
    
    async def remove_fcm_token(
        self,
        user_id: str,
        device_id: str
    ) -> None:
        """Remove FCM token for a device"""
        try:
            result = await self.collection.delete_one({
                "user_id": user_id,
                "device_id": device_id
            })
            if result.deleted_count == 0:
                raise TokenError("Token not found")
        except Exception as e:
            raise TokenError(f"Failed to remove FCM token: {str(e)}")
    
    async def get_user_tokens(self, user_id: str) -> List[FCMToken]:
        """Get all FCM tokens for a user"""
        try:
            cursor = self.collection.find({"user_id": user_id})
            tokens = []
            async for doc in cursor:
                tokens.append(FCMToken(**doc))
            return tokens
        except Exception as e:
            raise TokenError(f"Failed to get user tokens: {str(e)}")
    
    async def cleanup_invalid_tokens(self, user_id: str) -> None:
        """Remove invalid tokens for a user"""
        try:
            # Get user's tokens
            tokens = await self.get_user_tokens(user_id)
            
            # Verify each token with Firebase
            push_sender = PushNotificationSender()
            for token in tokens:
                is_valid = await push_sender.verify_token(token.token)
                if not is_valid:
                    await self.remove_fcm_token(user_id, token.device_id)
                    
        except Exception as e:
            raise TokenError(f"Failed to cleanup invalid tokens: {str(e)}")
