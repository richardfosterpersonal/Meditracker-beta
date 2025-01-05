"""
Notification Monitoring System
Handles monitoring and logging of notification delivery
Last Updated: 2025-01-03T22:28:16+01:00
"""

from datetime import datetime
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from ...core.config import get_database_url
from ...models.notification import NotificationStatus

class NotificationMonitor:
    """Monitor notification delivery and status"""
    
    def __init__(self):
        self.client = AsyncIOMotorClient(get_database_url())
        self.db = self.client.medication_tracker
        self.collection = self.db.notification_logs
    
    async def log_notification(
        self,
        notification_id: str,
        user_id: str,
        title: str,
        body: str,
        tokens: List[str],
        data: Optional[Dict] = None,
        status: str = NotificationStatus.PENDING
    ) -> Dict:
        """Log a notification attempt"""
        log = {
            "notification_id": notification_id,
            "user_id": user_id,
            "title": title,
            "body": body,
            "tokens": tokens,
            "data": data,
            "status": status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "attempts": 1,
            "success_count": 0,
            "failure_count": 0,
            "failed_tokens": [],
            "error_details": None
        }
        
        await self.collection.insert_one(log)
        return log
    
    async def update_status(
        self,
        notification_id: str,
        status: str,
        success_count: int = 0,
        failure_count: int = 0,
        failed_tokens: List[str] = None,
        error_details: Optional[str] = None
    ) -> None:
        """Update notification status"""
        update = {
            "status": status,
            "updated_at": datetime.utcnow(),
            "success_count": success_count,
            "failure_count": failure_count,
            "failed_tokens": failed_tokens or [],
            "error_details": error_details
        }
        
        await self.collection.update_one(
            {"notification_id": notification_id},
            {"$set": update, "$inc": {"attempts": 1}}
        )
    
    async def get_notification_status(self, notification_id: str) -> Dict:
        """Get notification status"""
        return await self.collection.find_one({"notification_id": notification_id})
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        """Get notifications for a user"""
        cursor = self.collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return [doc async for doc in cursor]
    
    async def get_failed_notifications(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """Get failed notifications within the last n hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        cursor = self.collection.find({
            "status": NotificationStatus.FAILED,
            "created_at": {"$gte": cutoff}
        }).sort("created_at", -1).limit(limit)
        
        return [doc async for doc in cursor]
    
    async def get_delivery_stats(
        self,
        user_id: Optional[str] = None,
        hours: int = 24
    ) -> Dict:
        """Get notification delivery statistics"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        match = {
            "created_at": {"$gte": cutoff}
        }
        
        if user_id:
            match["user_id"] = user_id
            
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "success_count": {"$sum": "$success_count"},
                    "failure_count": {"$sum": "$failure_count"}
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        
        stats = {
            "total": 0,
            "success": 0,
            "failure": 0,
            "pending": 0,
            "success_rate": 0,
            "period_hours": hours
        }
        
        for result in results:
            status = result["_id"]
            count = result["count"]
            stats["total"] += count
            stats[status.lower()] = count
            
        if stats["total"] > 0:
            stats["success_rate"] = (
                stats["success"] / stats["total"]
            ) * 100
            
        return stats
