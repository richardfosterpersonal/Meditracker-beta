from datetime import datetime, timedelta
from sqlalchemy import and_
from ..models.medication import Medication
from ..models.medication_history import MedicationHistory
from ..models.notification_preferences import NotificationPreferences
from ..models.notification import Notification
from .. import db

class NotificationScheduler:
    @staticmethod
    def schedule_notifications():
        """Schedule notifications for all users based on their medications and preferences"""
        try:
            # Get all active medications with their users
            medications = Medication.query.filter_by(active=True).all()
            
            for medication in medications:
                user_prefs = NotificationPreferences.query.filter_by(user_id=medication.user_id).first()
                if not user_prefs:
                    continue

                NotificationScheduler._schedule_dose_notifications(medication, user_prefs)
                NotificationScheduler._schedule_refill_reminder(medication, user_prefs)
                NotificationScheduler._check_interactions(medication, user_prefs)

        except Exception as e:
            print(f"Error scheduling notifications: {str(e)}")

    @staticmethod
    def _schedule_dose_notifications(medication, prefs):
        """Schedule upcoming dose notifications for a medication"""
        now = datetime.utcnow()
        schedule_until = now + timedelta(days=7)  # Schedule a week ahead

        # Calculate next doses
        next_doses = medication.get_next_doses(schedule_until)
        
        for dose_time in next_doses:
            # Check if notification already exists
            existing = Notification.query.filter(
                and_(
                    Notification.medication_id == medication.id,
                    Notification.type == 'UPCOMING_DOSE',
                    Notification.scheduled_time == dose_time
                )
            ).first()

            if not existing:
                # Create reminder notification
                reminder_time = dose_time - timedelta(minutes=prefs.reminder_advance_minutes)
                if reminder_time > now:
                    notification = Notification(
                        user_id=medication.user_id,
                        medication_id=medication.id,
                        type='UPCOMING_DOSE',
                        scheduled_time=reminder_time,
                        data={'medication_id': medication.id}
                    )
                    db.session.add(notification)

                # Create missed dose notification
                missed_time = dose_time + timedelta(minutes=30)  # 30 minutes grace period
                notification = Notification(
                    user_id=medication.user_id,
                    medication_id=medication.id,
                    type='MISSED_DOSE',
                    scheduled_time=missed_time,
                    data={'medication_id': medication.id}
                )
                db.session.add(notification)

        db.session.commit()

    @staticmethod
    def _schedule_refill_reminder(medication, prefs):
        """Schedule refill reminder if medication is running low"""
        if not medication.quantity or not medication.doses_remaining:
            return

        days_of_supply = medication.doses_remaining / medication.daily_frequency
        reminder_threshold = prefs.refill_reminder_days_before

        if days_of_supply <= reminder_threshold:
            # Check if a refill reminder already exists
            existing = Notification.query.filter(
                and_(
                    Notification.medication_id == medication.id,
                    Notification.type == 'REFILL_REMINDER',
                    Notification.scheduled_time > datetime.utcnow()
                )
            ).first()

            if not existing:
                notification = Notification(
                    user_id=medication.user_id,
                    medication_id=medication.id,
                    type='REFILL_REMINDER',
                    scheduled_time=datetime.utcnow(),
                    data={'medication_id': medication.id}
                )
                db.session.add(notification)
                db.session.commit()

    @staticmethod
    def _check_interactions(medication, prefs):
        """Check for interactions with other medications"""
        if not prefs.notify_interactions:
            return

        # Get all other active medications for the user
        other_medications = Medication.query.filter(
            and_(
                Medication.user_id == medication.user_id,
                Medication.id != medication.id,
                Medication.active == True
            )
        ).all()

        for other_med in other_medications:
            if medication.has_interaction_with(other_med):
                # Check if an interaction warning already exists
                existing = Notification.query.filter(
                    and_(
                        Notification.user_id == medication.user_id,
                        Notification.type == 'INTERACTION_WARNING',
                        Notification.data.contains({
                            'medications': [medication.id, other_med.id]
                        })
                    )
                ).first()

                if not existing:
                    notification = Notification(
                        user_id=medication.user_id,
                        type='INTERACTION_WARNING',
                        scheduled_time=datetime.utcnow(),
                        data={
                            'medications': [medication.id, other_med.id]
                        }
                    )
                    db.session.add(notification)

        db.session.commit()

    @staticmethod
    def clean_old_notifications():
        """Remove old notifications that are no longer relevant"""
        week_ago = datetime.utcnow() - timedelta(days=7)
        Notification.query.filter(
            Notification.scheduled_time < week_ago
        ).delete()
        db.session.commit()
