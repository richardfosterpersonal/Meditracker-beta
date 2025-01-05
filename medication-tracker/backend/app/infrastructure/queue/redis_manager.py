from typing import Optional, Dict, Any
import json
import redis.asyncio as redis
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisQueueManager:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.notification_queue = "notification_queue"
        self.dead_letter_queue = "notification_dlq"
        self.processing_queue = "notification_processing"
        
    async def connect(self):
        if not self.redis:
            try:
                self.redis = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                logger.info("Successfully connected to Redis")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {str(e)}")
                raise
                
    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            self.redis = None
            
    async def enqueue_notification(self, notification_data: Dict[str, Any], schedule_time: Optional[datetime] = None):
        """Add a notification to the queue"""
        if not self.redis:
            await self.connect()
            
        try:
            message = {
                "data": notification_data,
                "attempts": 0,
                "created_at": datetime.utcnow().isoformat(),
                "schedule_time": schedule_time.isoformat() if schedule_time else None
            }
            
            # If scheduled for later, add to sorted set with schedule time as score
            if schedule_time:
                await self.redis.zadd(
                    "scheduled_notifications",
                    {json.dumps(message): schedule_time.timestamp()}
                )
            else:
                await self.redis.lpush(self.notification_queue, json.dumps(message))
                
            logger.info(f"Notification enqueued successfully: {notification_data.get('id')}")
            
        except Exception as e:
            logger.error(f"Failed to enqueue notification: {str(e)}")
            raise
            
    async def dequeue_notification(self) -> Optional[Dict[str, Any]]:
        """Get the next notification from the queue"""
        if not self.redis:
            await self.connect()
            
        try:
            # First check scheduled notifications
            now = datetime.utcnow().timestamp()
            scheduled = await self.redis.zrangebyscore(
                "scheduled_notifications",
                "-inf",
                now,
                start=0,
                num=1
            )
            
            if scheduled:
                # Remove from scheduled set and return
                notification = json.loads(scheduled[0])
                await self.redis.zrem("scheduled_notifications", scheduled[0])
                return notification
                
            # If no scheduled notifications are ready, check regular queue
            data = await self.redis.rpop(self.notification_queue)
            if data:
                return json.loads(data)
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to dequeue notification: {str(e)}")
            raise
            
    async def move_to_dlq(self, notification: Dict[str, Any], error: str):
        """Move a failed notification to the dead letter queue"""
        if not self.redis:
            await self.connect()
            
        try:
            notification["error"] = error
            notification["moved_to_dlq_at"] = datetime.utcnow().isoformat()
            await self.redis.lpush(self.dead_letter_queue, json.dumps(notification))
            logger.info(f"Notification moved to DLQ: {notification.get('data', {}).get('id')}")
            
        except Exception as e:
            logger.error(f"Failed to move notification to DLQ: {str(e)}")
            raise
            
    async def retry_from_dlq(self):
        """Retry sending notifications from the dead letter queue"""
        if not self.redis:
            await self.connect()
            
        try:
            while True:
                data = await self.redis.rpop(self.dead_letter_queue)
                if not data:
                    break
                    
                notification = json.loads(data)
                notification["attempts"] = 0
                notification.pop("error", None)
                notification.pop("moved_to_dlq_at", None)
                
                await self.enqueue_notification(notification["data"])
                
        except Exception as e:
            logger.error(f"Failed to retry notifications from DLQ: {str(e)}")
            raise
            
    async def get_queue_stats(self) -> Dict[str, int]:
        """Get statistics about the queues"""
        if not self.redis:
            await self.connect()
            
        try:
            pending = await self.redis.llen(self.notification_queue)
            dlq = await self.redis.llen(self.dead_letter_queue)
            scheduled = await self.redis.zcard("scheduled_notifications")
            
            return {
                "pending_notifications": pending,
                "dead_letter_queue": dlq,
                "scheduled_notifications": scheduled
            }
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {str(e)}")
            raise

# Global queue manager instance
queue_manager = RedisQueueManager()
