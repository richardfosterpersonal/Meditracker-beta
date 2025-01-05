from datetime import datetime, timedelta
from flask import current_app
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from ..models.medication import Medication
from ..models.notification import Notification
from .. import db

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        
        # Schedule regular checks
        self.schedule_regular_checks()
    
    def schedule_regular_checks(self):
        """Schedule regular maintenance tasks"""
        # Check for missed doses every 15 minutes
        self.scheduler.add_job(
            self.check_missed_doses,
            IntervalTrigger(minutes=15),
            id='check_missed_doses'
        )
        
        # Check for medications needing refills daily at midnight
        self.scheduler.add_job(
            self.check_refills_needed,
            CronTrigger(hour=0),
            id='check_refills'
        )
        
        # Check for medication interactions hourly
        self.scheduler.add_job(
            self.check_interactions,
            IntervalTrigger(hours=1),
            id='check_interactions'
        )
    
    def check_missed_doses(self):
        """Check for missed medication doses"""
        try:
            medications = Medication.query.filter(
                Medication.reminder_enabled == True,
                Medication.next_dose < datetime.utcnow()
            ).all()
            
            for medication in medications:
                if medication.check_missed_dose():
                    current_app.logger.info(
                        f"Missed dose detected for medication {medication.id}"
                    )
                    
                    # Schedule next dose
                    medication.schedule_next_dose()
        
        except Exception as e:
            current_app.logger.error(f"Error checking missed doses: {str(e)}")
    
    def check_refills_needed(self):
        """Check for medications needing refills"""
        try:
            medications = Medication.query.filter(
                Medication.refill_reminder_enabled == True,
                Medication.remaining_doses <= Medication.refill_reminder_doses
            ).all()
            
            for medication in medications:
                # Check if we already sent a reminder recently
                recent_reminder = Notification.query.filter(
                    Notification.medication_id == medication.id,
                    Notification.type == 'REFILL_REMINDER',
                    Notification.created_at > datetime.utcnow() - timedelta(days=3)
                ).first()
                
                if not recent_reminder:
                    Notification.create_refill_reminder(
                        medication.user_id,
                        medication
                    )
                    current_app.logger.info(
                        f"Refill reminder created for medication {medication.id}"
                    )
        
        except Exception as e:
            current_app.logger.error(f"Error checking refills: {str(e)}")
    
    def check_interactions(self):
        """Check for potential medication interactions"""
        try:
            # Get all active medications grouped by user
            users_medications = {}
            medications = Medication.query.filter(
                Medication.end_date.is_(None) |
                (Medication.end_date > datetime.utcnow())
            ).all()
            
            for med in medications:
                if med.user_id not in users_medications:
                    users_medications[med.user_id] = []
                users_medications[med.user_id].append(med)
            
            # Check interactions for each user's medications
            for user_id, meds in users_medications.items():
                for i, med1 in enumerate(meds):
                    for med2 in meds[i+1:]:
                        if med1.check_interactions(med2):
                            # Check if we already sent a warning recently
                            recent_warning = Notification.query.filter(
                                Notification.user_id == user_id,
                                Notification.type == 'INTERACTION_WARNING',
                                Notification.created_at > datetime.utcnow() - timedelta(days=7)
                            ).first()
                            
                            if not recent_warning:
                                Notification.create_interaction_warning(
                                    user_id,
                                    [med1, med2]
                                )
                                current_app.logger.info(
                                    f"Interaction warning created for medications {med1.id} and {med2.id}"
                                )
        
        except Exception as e:
            current_app.logger.error(f"Error checking interactions: {str(e)}")
    
    def schedule_medication_notifications(self, medication):
        """Schedule notifications for a medication"""
        try:
            # Cancel existing notifications
            self.cancel_medication_notifications(medication)
            
            if not medication.reminder_enabled:
                return
            
            # Schedule next dose notification
            if medication.next_dose:
                reminder_time = medication.next_dose - timedelta(minutes=medication.reminder_time)
                
                # Only schedule if reminder time is in the future
                if reminder_time > datetime.utcnow():
                    Notification.create_upcoming_dose_notification(
                        medication.user_id,
                        medication,
                        reminder_time
                    )
                    current_app.logger.info(
                        f"Scheduled dose reminder for medication {medication.id}"
                    )
        
        except Exception as e:
            current_app.logger.error(
                f"Error scheduling medication notifications: {str(e)}"
            )
    
    def cancel_medication_notifications(self, medication):
        """Cancel all scheduled notifications for a medication"""
        try:
            notifications = Notification.query.filter(
                Notification.medication_id == medication.id,
                Notification.status == 'scheduled'
            ).all()
            
            for notification in notifications:
                notification.cancel()
            
            current_app.logger.info(
                f"Cancelled notifications for medication {medication.id}"
            )
        
        except Exception as e:
            current_app.logger.error(
                f"Error cancelling medication notifications: {str(e)}"
            )
    
    def shutdown(self):
        """Shutdown the scheduler"""
        self.scheduler.shutdown()

# Create a singleton instance
scheduler_service = SchedulerService()
