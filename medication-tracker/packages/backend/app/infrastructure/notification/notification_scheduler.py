"""
Notification Scheduler
Handles scheduling and sending of periodic medication reminders
Last Updated: 2025-01-02T22:21:23+01:00
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ...core.enforcer_decorators import (
    requires_context,
    enforces_requirements,
    validates_scope,
    maintains_critical_path
)
from ...core.development_mode import DevelopmentConfig
from ...exceptions import NotificationError
from .push_sender import PushSender, NotificationType, NotificationPriority
from ...models.medication import MedicationSchedule
from ...services.medication_service import MedicationService

class NotificationScheduler:
    """Handles scheduling of medication reminders"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.push_sender = PushSender()
        self.medication_service = MedicationService()
        self.dev_config = DevelopmentConfig()
        self._initialize_scheduler()
        
    def _initialize_scheduler(self):
        """Initialize the scheduler"""
        self.scheduler.start()
        
    @requires_context(
        component="notification",
        feature="medication_reminders",
        task="scheduling"
    )
    @enforces_requirements(
        "REQ001: HIPAA Compliance",
        "REQ002: Medication Safety",
        "REQ003: Timely Reminders"
    )
    async def schedule_medication_reminder(
        self,
        user_id: str,
        medication_id: str,
        schedule: MedicationSchedule,
        timezone: str
    ):
        """Schedule medication reminders based on medication schedule"""
        try:
            user_tz = pytz.timezone(timezone)
            
            for time in schedule.times:
                # Parse time string
                hour, minute = map(int, time.split(':'))
                
                # Create cron trigger
                if schedule.type == 'daily':
                    trigger = CronTrigger(
                        hour=hour,
                        minute=minute,
                        timezone=user_tz
                    )
                elif schedule.type == 'weekly':
                    if not schedule.days:
                        raise ValueError("Days must be specified for weekly schedule")
                    trigger = CronTrigger(
                        day_of_week=','.join(map(str, schedule.days)),
                        hour=hour,
                        minute=minute,
                        timezone=user_tz
                    )
                elif schedule.type == 'monthly':
                    if not schedule.days:
                        raise ValueError("Days must be specified for monthly schedule")
                    trigger = CronTrigger(
                        day=','.join(map(str, schedule.days)),
                        hour=hour,
                        minute=minute,
                        timezone=user_tz
                    )
                elif schedule.type == 'custom':
                    if not schedule.interval:
                        raise ValueError("Interval must be specified for custom schedule")
                    trigger = IntervalTrigger(
                        days=schedule.interval,
                        start_date=datetime.fromisoformat(schedule.startDate),
                        end_date=schedule.endDate and datetime.fromisoformat(schedule.endDate),
                        timezone=user_tz
                    )
                else:
                    raise ValueError(f"Invalid schedule type: {schedule.type}")
                
                # Add job to scheduler
                job_id = f"med_{medication_id}_{time}"
                self.scheduler.add_job(
                    self._send_medication_reminder,
                    trigger=trigger,
                    args=[user_id, medication_id],
                    id=job_id,
                    replace_existing=True
                )
                
        except Exception as e:
            raise NotificationError(f"Failed to schedule medication reminder: {str(e)}")
            
    async def _send_medication_reminder(self, user_id: str, medication_id: str):
        """Send medication reminder notification"""
        try:
            # Get medication details
            medication = await self.medication_service.get_medication(medication_id)
            
            # Check if medication is still active
            if not self._is_medication_active(medication):
                self._remove_medication_schedule(medication_id)
                return
                
            # Send notification
            await self.push_sender.send_notification(
                user_id=user_id,
                message=f"Time to take {medication.name}",
                notification_type=NotificationType.REMINDER,
                priority=NotificationPriority.HIGH,
                metadata={
                    "medication_id": medication_id,
                    "dosage": medication.dosage,
                    "instructions": medication.instructions
                }
            )
            
        except Exception as e:
            self.dev_config.logger.error(
                f"Failed to send medication reminder: {str(e)}",
                extra={
                    "user_id": user_id,
                    "medication_id": medication_id,
                    "error": str(e)
                }
            )
            
    def _is_medication_active(self, medication: Dict) -> bool:
        """Check if medication schedule is still active"""
        now = datetime.now(pytz.UTC)
        start_date = datetime.fromisoformat(medication.schedule.startDate)
        
        if start_date > now:
            return False
            
        if medication.schedule.endDate:
            end_date = datetime.fromisoformat(medication.schedule.endDate)
            if end_date < now:
                return False
                
        return True
        
    def _remove_medication_schedule(self, medication_id: str):
        """Remove all scheduled jobs for a medication"""
        for job in self.scheduler.get_jobs():
            if job.id.startswith(f"med_{medication_id}_"):
                job.remove()
                
    @maintains_critical_path("medication_scheduling")
    async def update_medication_schedule(
        self,
        user_id: str,
        medication_id: str,
        new_schedule: MedicationSchedule,
        timezone: str
    ):
        """Update existing medication schedule"""
        try:
            # Remove existing schedule
            self._remove_medication_schedule(medication_id)
            
            # Create new schedule
            await self.schedule_medication_reminder(
                user_id,
                medication_id,
                new_schedule,
                timezone
            )
            
        except Exception as e:
            raise NotificationError(f"Failed to update medication schedule: {str(e)}")
            
    async def remove_user_schedules(self, user_id: str):
        """Remove all scheduled notifications for a user"""
        try:
            medications = await self.medication_service.get_user_medications(user_id)
            for medication in medications:
                self._remove_medication_schedule(medication.id)
                
        except Exception as e:
            raise NotificationError(f"Failed to remove user schedules: {str(e)}")
            
    def shutdown(self):
        """Shutdown the scheduler"""
        self.scheduler.shutdown()
