"""Worker for processing medication reminders."""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
import redis
from rq import Queue, Worker, Connection
from rq.job import Job

from ..core.config import get_settings
from ..security.sql_security import secure_query_wrapper
from ..infrastructure.repositories.medication_repository import SQLMedicationRepository
from ..infrastructure.database import get_db
from ..domain.medication.entities import MedicationEntity
from ..services.notification_service import NotificationService
from ..security.audit_logger import AuditLogger

logger = logging.getLogger(__name__)
audit_logger = AuditLogger(__name__)

class ReminderWorker:
    """Worker for processing medication reminders."""

    def __init__(self):
        """Initialize the reminder worker with dependencies."""
        self.settings = get_settings()
        self._setup_redis_connection()
        self._setup_notification_service()
        self.db = next(get_db())
        self.medication_repository = SQLMedicationRepository(self.db)

    def _setup_redis_connection(self) -> None:
        """Setup Redis connection with security measures."""
        try:
            self.redis_conn = redis.Redis(
                host=self.settings.REDIS_HOST,
                port=self.settings.REDIS_PORT,
                password=self.settings.REDIS_PASSWORD,
                ssl=self.settings.REDIS_SSL,
                ssl_cert_reqs=None if self.settings.REDIS_SSL else None,
                socket_timeout=5,
                retry_on_timeout=True
            )
            self.queue = Queue('reminders', connection=self.redis_conn)
        except redis.RedisError as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise

    def _setup_notification_service(self) -> None:
        """Setup notification service with security measures."""
        try:
            self.notification_service = NotificationService(
                api_key=self.settings.NOTIFICATION_API_KEY,
                base_url=self.settings.NOTIFICATION_API_URL,
                timeout=10
            )
        except Exception as e:
            logger.error(f"Failed to initialize notification service: {str(e)}")
            raise

    @secure_query_wrapper
    def process_reminders(self) -> None:
        """Process due medication reminders with security measures."""
        try:
            current_time = datetime.utcnow()
            window_start = current_time - timedelta(minutes=5)
            window_end = current_time + timedelta(minutes=5)

            # Log processing start
            audit_logger.info(
                "reminder_processing_start",
                {"window_start": window_start, "window_end": window_end}
            )

            # Get due medications with security wrapper
            due_medications = self.medication_repository.get_due_medications(
                window_start,
                window_end
            )

            # Process each medication
            for medication in due_medications:
                self._process_medication_reminder(medication, current_time)

            # Log processing completion
            audit_logger.info(
                "reminder_processing_complete",
                {"medications_processed": len(due_medications)}
            )

        except Exception as e:
            audit_logger.error(
                "reminder_processing_error",
                {"error": str(e)}
            )
            logger.error(f"Error processing reminders: {str(e)}")
            raise

    def _process_medication_reminder(
        self,
        medication: MedicationEntity,
        current_time: datetime
    ) -> None:
        """Process reminder for a single medication."""
        try:
            # Check rate limit for notifications
            if self._is_rate_limited(medication.user_id):
                audit_logger.warning(
                    "reminder_rate_limited",
                    {
                        "user_id": medication.user_id,
                        "medication_id": medication.id
                    }
                )
                return

            # Create notification job
            job = self._create_notification_job(medication, current_time)
            
            # Log notification queued
            audit_logger.info(
                "reminder_notification_queued",
                {
                    "job_id": job.id,
                    "medication_id": medication.id,
                    "user_id": medication.user_id
                }
            )

        except Exception as e:
            audit_logger.error(
                "reminder_notification_error",
                {
                    "medication_id": medication.id,
                    "error": str(e)
                }
            )
            logger.error(
                f"Error processing reminder for medication {medication.id}: {str(e)}"
            )
            raise

    def _is_rate_limited(self, user_id: int) -> bool:
        """Check if user has exceeded notification rate limit."""
        try:
            key = f"reminder_rate_limit:{user_id}"
            count = self.redis_conn.get(key)
            
            if count is None:
                self.redis_conn.setex(
                    key,
                    timedelta(minutes=15),
                    1
                )
                return False
                
            count = int(count)
            if count >= self.settings.MAX_REMINDERS_PER_15_MIN:
                return True
                
            self.redis_conn.incr(key)
            return False

        except redis.RedisError as e:
            logger.error(f"Rate limit check failed: {str(e)}")
            return False  # Fail open to ensure medications are not missed

    def _create_notification_job(
        self,
        medication: MedicationEntity,
        current_time: datetime
    ) -> Job:
        """Create a notification job with security measures."""
        try:
            # Prepare notification data
            notification_data = {
                "user_id": medication.user_id,
                "medication_id": medication.id,
                "medication_name": medication.name,
                "dosage": medication.dosage,
                "scheduled_time": current_time.isoformat(),
                "notification_type": "medication_reminder"
            }

            # Enqueue notification job
            job = self.queue.enqueue(
                self.notification_service.send_notification,
                notification_data,
                retry=self.settings.NOTIFICATION_MAX_RETRIES,
                ttl=300  # 5 minutes
            )

            return job

        except Exception as e:
            logger.error(f"Failed to create notification job: {str(e)}")
            raise

    def cleanup_old_jobs(self) -> None:
        """Clean up old jobs from the queue."""
        try:
            # Get all jobs from the queue
            registry = self.queue.finished_job_registry
            job_ids = registry.get_job_ids()

            # Remove jobs older than 24 hours
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            for job_id in job_ids:
                job = Job.fetch(job_id, connection=self.redis_conn)
                if job.ended_at and job.ended_at < cutoff_time:
                    registry.remove(job)
                    job.delete()

            audit_logger.info(
                "reminder_job_cleanup",
                {"jobs_cleaned": len(job_ids)}
            )

        except Exception as e:
            audit_logger.error(
                "reminder_cleanup_error",
                {"error": str(e)}
            )
            logger.error(f"Error cleaning up old jobs: {str(e)}")
            raise
