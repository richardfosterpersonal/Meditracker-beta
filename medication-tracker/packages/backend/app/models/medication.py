from app import db
from datetime import datetime, timedelta
from .notification import Notification
import json
import pytz

class Medication(db.Model):
    __tablename__ = 'medications'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50), nullable=False)
    frequency = db.Column(db.String(50), nullable=False)
    next_dose = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    instructions = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    reminder_enabled = db.Column(db.Boolean, default=True)
    reminder_time = db.Column(db.Integer, default=30)  # minutes before dose
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # New columns for dose tracking
    doses_per_day = db.Column(db.Integer, nullable=True)  # Changed to nullable for PRN meds
    dose_times = db.Column(db.JSON, nullable=True)  # List of times in HH:MM format
    remaining_doses = db.Column(db.Integer, nullable=True)
    last_taken = db.Column(db.DateTime, nullable=True)
    refill_reminder_enabled = db.Column(db.Boolean, default=True)
    refill_reminder_doses = db.Column(db.Integer, default=7)  # Remind when X doses remain
    
    # PRN medication fields
    is_prn = db.Column(db.Boolean, default=False)  # True if this is a PRN medication
    min_hours_between_doses = db.Column(db.Integer, nullable=True)  # Minimum hours between PRN doses
    max_daily_doses = db.Column(db.Integer, nullable=True)  # Maximum number of doses per day for PRN
    reason_for_taking = db.Column(db.Text, nullable=True)  # Why the PRN medication was taken
    daily_doses_taken = db.Column(db.Integer, default=0)  # Number of doses taken today
    daily_doses_reset_at = db.Column(db.DateTime, nullable=True)  # When to reset daily_doses_taken

    # New columns for medication validation
    dosage_unit = db.Column(db.String(20), nullable=False)  # e.g., "mg", "ml", "tablet"
    dosage_value = db.Column(db.Float, nullable=False)  # numeric value of dosage
    dosage_validated = db.Column(db.Boolean, default=False)
    validation_message = db.Column(db.String(200), nullable=True)
    suggested_dosages = db.Column(db.JSON, nullable=True)  # List of suggested dosages if validation fails

    def schedule_next_dose(self):
        """Schedule the next dose based on frequency and dose times"""
        if not self.dose_times:
            return

        now = datetime.utcnow()
        user_tz = pytz.timezone(self.user.timezone)
        local_now = now.astimezone(user_tz)
        
        # Convert dose times to datetime objects
        today_doses = []
        tomorrow_doses = []
        dose_times = json.loads(self.dose_times) if isinstance(self.dose_times, str) else self.dose_times
        
        for time_str in dose_times:
            hour, minute = map(int, time_str.split(':'))
            dose_time = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            if dose_time > local_now:
                today_doses.append(dose_time)
            tomorrow_doses.append(dose_time + timedelta(days=1))
        
        # Find the next dose time
        next_doses = sorted(today_doses + tomorrow_doses)
        if next_doses:
            self.next_dose = next_doses[0].astimezone(pytz.UTC)
            db.session.commit()

    def record_dose_taken(self, taken_at=None, reason=None):
        """Record that a dose was taken"""
        taken_at = taken_at or datetime.utcnow()
        self.last_taken = taken_at
        
        if self.is_prn:
            # Check if we need to reset daily doses
            now = datetime.utcnow()
            if not self.daily_doses_reset_at or self.daily_doses_reset_at.date() < now.date():
                self.daily_doses_taken = 0
                self.daily_doses_reset_at = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Update PRN-specific fields
            self.daily_doses_taken += 1
            if reason:
                self.reason_for_taking = reason
        
        if self.remaining_doses is not None:
            self.remaining_doses -= 1
            
            # Create refill reminder if needed
            if (self.refill_reminder_enabled and 
                self.remaining_doses <= self.refill_reminder_doses):
                Notification.create_refill_reminder(self.user_id, self)
        
        # Only schedule next dose for non-PRN medications
        if not self.is_prn:
            self.schedule_next_dose()
        db.session.commit()

    def can_take_dose(self):
        """Check if it's safe to take a dose of this medication"""
        if not self.is_prn:
            return True
            
        now = datetime.utcnow()
        
        # Check if we need to reset daily doses
        if not self.daily_doses_reset_at or self.daily_doses_reset_at.date() < now.date():
            self.daily_doses_taken = 0
            self.daily_doses_reset_at = now.replace(hour=0, minute=0, second=0, microsecond=0)
            db.session.commit()
            
        # Check maximum daily doses
        if self.max_daily_doses and self.daily_doses_taken >= self.max_daily_doses:
            return False
            
        # Check minimum time between doses
        if self.min_hours_between_doses and self.last_taken:
            hours_since_last_dose = (now - self.last_taken).total_seconds() / 3600
            if hours_since_last_dose < self.min_hours_between_doses:
                return False
                
        return True

    def schedule_notifications(self):
        """Schedule notifications for upcoming doses"""
        if not self.reminder_enabled:
            return

        # Cancel existing notifications
        Notification.query.filter_by(
            medication_id=self.id,
            type='UPCOMING_DOSE',
            status='scheduled'
        ).update({'status': 'cancelled'})
        
        # Schedule new notifications
        if self.next_dose:
            reminder_time = self.next_dose - timedelta(minutes=self.reminder_time)
            Notification.create_upcoming_dose_notification(
                self.user_id,
                self,
                reminder_time
            )

    def check_missed_dose(self):
        """Check if the last scheduled dose was missed"""
        if not self.next_dose or not self.last_taken:
            return False
            
        now = datetime.utcnow()
        missed_threshold = timedelta(hours=1)  # Consider dose missed after 1 hour
        
        if (now - self.next_dose) > missed_threshold:
            # Create missed dose notification
            Notification.create_missed_dose_notification(
                self.user_id,
                self,
                self.next_dose
            )
            return True
            
        return False

    def check_interactions(self, other_medication):
        """Check for potential interactions with another medication"""
        # This is a placeholder for interaction checking logic
        # In a real application, this would use a drug interaction database
        return False

    def days_until_refill_needed(self):
        """Calculate days until refill is needed based on remaining doses"""
        if self.remaining_doses is None or not self.doses_per_day:
            return None
        return self.remaining_doses / self.doses_per_day

    def validate_medication(self):
        """Validate medication dosage and frequency"""
        from app.services.medication_validation_service import MedicationValidationService, TimeOfDay
        
        validator = MedicationValidationService()
        
        # Validate dosage
        is_valid_dosage, message, suggestions = validator.validate_dosage(
            self.name,
            f"{self.dosage_value} {self.dosage_unit}",
            self.frequency
        )
        
        # Validate frequency if dosage is valid
        if is_valid_dosage and not self.is_prn:
            times = [TimeOfDay(t) for t in self.dose_times] if self.dose_times else []
            is_valid_freq, freq_message = validator.validate_frequency(self.frequency, times)
            
            if not is_valid_freq:
                is_valid_dosage = False
                message = freq_message
        
        self.dosage_validated = is_valid_dosage
        self.validation_message = message
        self.suggested_dosages = suggestions if not is_valid_dosage else None
        
        return is_valid_dosage

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'nextDose': self.next_dose.isoformat() if self.next_dose else None,
            'userId': self.user_id,
            'category': self.category,
            'instructions': self.instructions,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'reminderEnabled': self.reminder_enabled,
            'reminderTime': self.reminder_time,
            'dosesPerDay': self.doses_per_day,
            'doseTimes': self.dose_times,
            'remainingDoses': self.remaining_doses,
            'lastTaken': self.last_taken.isoformat() if self.last_taken else None,
            'refillReminderEnabled': self.refill_reminder_enabled,
            'refillReminderDoses': self.refill_reminder_doses,
            'isPrn': self.is_prn,
            'minHoursBetweenDoses': self.min_hours_between_doses,
            'maxDailyDoses': self.max_daily_doses,
            'reasonForTaking': self.reason_for_taking,
            'dailyDosesTaken': self.daily_doses_taken,
            'canTakeDose': self.can_take_dose(),
            'dosageUnit': self.dosage_unit,
            'dosageValue': self.dosage_value,
            'dosageValidated': self.dosage_validated,
            'validationMessage': self.validation_message,
            'suggestedDosages': self.suggested_dosages,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }