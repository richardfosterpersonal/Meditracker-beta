import asyncio
import logging
from typing import Optional
from datetime import datetime
from app.infrastructure.queue.redis_manager import queue_manager
from app.application.services.notification_service import NotificationApplicationService
from app.domain.notification.entities import Notification
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationWorker:
    def __init__(self, notification_service: NotificationApplicationService):
        self.notification_service = notification_service
        self.running = False
        self.current_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the notification worker"""
        if self.running:
            return
            
        self.running = True
        self.current_task = asyncio.create_task(self._process_queue())
        logger.info("Notification worker started")
        
    async def stop(self):
        """Stop the notification worker"""
        self.running = False
        if self.current_task:
            self.current_task.cancel()
            try:
                await self.current_task
            except asyncio.CancelledError:
                pass
        logger.info("Notification worker stopped")
        
    async def _process_queue(self):
        """Main queue processing loop"""
        while self.running:
            try:
                # Get next notification from queue
                notification_data = await queue_manager.dequeue_notification()
                if not notification_data:
                    # No notifications to process, wait before checking again
                    await asyncio.sleep(settings.QUEUE_POLL_INTERVAL)
                    continue
                    
                # Convert queue data to Notification entity
                notification = Notification.from_dict(notification_data["data"])
                
                # Process the notification
                try:
                    await self.notification_service.send_notification(notification)
                    logger.info(f"Successfully processed notification: {notification.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to process notification {notification.id}: {str(e)}")
                    notification_data["attempts"] += 1
                    
                    if notification_data["attempts"] >= settings.MAX_NOTIFICATION_ATTEMPTS:
                        # Move to dead letter queue after max attempts
                        await queue_manager.move_to_dlq(
                            notification_data,
                            f"Max attempts ({settings.MAX_NOTIFICATION_ATTEMPTS}) reached. Last error: {str(e)}"
                        )
                    else:
                        # Re-queue with exponential backoff
                        delay = 2 ** notification_data["attempts"]  # exponential backoff
                        schedule_time = datetime.utcnow().timestamp() + delay
                        await queue_manager.enqueue_notification(
                            notification_data["data"],
                            schedule_time
                        )
                        
            except Exception as e:
                logger.error(f"Error in notification worker: {str(e)}")
                await asyncio.sleep(settings.QUEUE_ERROR_RETRY_INTERVAL)
                
    @classmethod
    async def create_and_start(cls, notification_service: NotificationApplicationService):
        """Factory method to create and start a worker"""
        worker = cls(notification_service)
        await worker.start()
        return worker
