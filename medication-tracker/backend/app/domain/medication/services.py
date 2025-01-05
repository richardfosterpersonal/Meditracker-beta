from datetime import datetime, timedelta
from typing import List, Optional
from .entities import Medication, Schedule, Dosage
from .repositories import MedicationRepository
from ..notification.services import NotificationService
from ..user.repositories import UserRepository

class MedicationDomainService:
    def __init__(
        self,
        medication_repository: MedicationRepository,
        notification_service: NotificationService,
        user_repository: UserRepository
    ):
        self._medication_repository = medication_repository
        self._notification_service = notification_service
        self._user_repository = user_repository

    def schedule_medication(
        self,
        name: str,
        dosage: Dosage,
        schedule: Schedule,
        user_id: int,
        **kwargs
    ) -> Medication:
        """Schedule a new medication"""
        medication = Medication(
            name=name,
            dosage=dosage,
            schedule=schedule,
            user_id=user_id,
            **kwargs
        )
        
        saved_medication = self._medication_repository.save(medication)
        self._schedule_reminders(saved_medication)
        return saved_medication

    def record_medication_taken(
        self,
        medication_id: int,
        taken_at: datetime
    ) -> Medication:
        """Record that a medication was taken"""
        medication = self._medication_repository.get_by_id(medication_id)
        if not medication:
            raise ValueError("Medication not found")

        if not medication.can_take_dose(taken_at):
            raise ValueError("Cannot take medication at this time")

        medication.record_dose_taken(taken_at)
        return self._medication_repository.update(medication)

    def check_interactions(
        self,
        user_id: int,
        new_medication_name: str
    ) -> List[str]:
        """Check for interactions with existing medications"""
        current_medications = self._medication_repository.get_by_user_id(user_id)
        # Interaction checking logic would go here
        return []

    def get_due_medications(
        self,
        user_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Medication]:
        """Get medications due in a time range"""
        if not start_time:
            start_time = datetime.utcnow()
        if not end_time:
            end_time = start_time + timedelta(days=1)

        return self._medication_repository.get_due_medications(start_time, end_time)

    def _schedule_reminders(self, medication: Medication):
        """Schedule reminders for a medication"""
        user = self._user_repository.get_by_id(medication.user_id)
        if not user:
            raise ValueError("User not found")

        # Reminder scheduling logic would go here
        pass
