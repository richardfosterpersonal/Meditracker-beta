from datetime import datetime, timedelta
from typing import List, Optional
from app.domain.medication.entities import Medication, Dosage, Schedule
from app.domain.medication.repositories import MedicationRepository
from app.domain.notification.services import NotificationDomainService
from app.domain.user.repositories import UserRepository, CarerRepository
from app.application.dtos.medication import (
    CreateMedicationDTO,
    UpdateMedicationDTO,
    MedicationResponseDTO,
    RecordDoseDTO,
    MedicationComplianceDTO,
    MedicationReminderDTO
)
from app.application.exceptions import (
    NotFoundException,
    ValidationError,
    UnauthorizedError
)

class MedicationApplicationService:
    def __init__(
        self,
        medication_repository: MedicationRepository,
        notification_service: NotificationDomainService,
        user_repository: UserRepository,
        carer_repository: CarerRepository
    ):
        self._medication_repository = medication_repository
        self._notification_service = notification_service
        self._user_repository = user_repository
        self._carer_repository = carer_repository

    def create_medication(
        self,
        dto: CreateMedicationDTO,
        created_by_id: int
    ) -> MedicationResponseDTO:
        """Create a new medication schedule"""
        # Validate user exists
        user = self._user_repository.get_by_id(dto.user_id)
        if not user:
            raise NotFoundException("User not found")

        # Check authorization
        if created_by_id != dto.user_id:
            carer = self._carer_repository.get_by_user_id(created_by_id)
            if not carer or dto.user_id not in carer.patients:
                raise UnauthorizedError("Not authorized to create medications for this user")

        # Create domain entities
        dosage = Dosage(
            amount=dto.dosage.amount,
            unit=dto.dosage.unit,
            frequency=dto.dosage.frequency,
            times_per_day=dto.dosage.times_per_day,
            specific_times=dto.dosage.specific_times
        )

        schedule = Schedule(
            start_date=dto.schedule.start_date,
            end_date=dto.schedule.end_date,
            reminder_time=dto.schedule.reminder_time,
            dose_times=dto.schedule.dose_times,
            timezone=dto.schedule.timezone
        )

        medication = Medication(
            name=dto.name,
            dosage=dosage,
            schedule=schedule,
            user_id=dto.user_id,
            category=dto.category,
            instructions=dto.instructions,
            is_prn=dto.is_prn,
            min_hours_between_doses=dto.min_hours_between_doses,
            max_daily_doses=dto.max_daily_doses,
            reason_for_taking=dto.reason_for_taking
        )

        if dto.remaining_doses is not None:
            medication.remaining_doses = dto.remaining_doses

        # Save medication
        saved_medication = self._medication_repository.save(medication)

        # Schedule notifications
        self._schedule_medication_reminders(saved_medication)

        # Return response
        return self._to_response_dto(saved_medication)

    def update_medication(
        self,
        medication_id: int,
        dto: UpdateMedicationDTO,
        updated_by_id: int
    ) -> MedicationResponseDTO:
        """Update an existing medication"""
        # Get existing medication
        medication = self._medication_repository.get_by_id(medication_id)
        if not medication:
            raise NotFoundException("Medication not found")

        # Check authorization
        if updated_by_id != medication.user_id:
            carer = self._carer_repository.get_by_user_id(updated_by_id)
            if not carer or medication.user_id not in carer.patients:
                raise UnauthorizedError("Not authorized to update this medication")

        # Update medication
        medication.name = dto.name
        medication.dosage = Dosage(**dto.dosage.__dict__)
        medication.schedule = Schedule(**dto.schedule.__dict__)
        medication.category = dto.category
        medication.instructions = dto.instructions
        medication.is_prn = dto.is_prn
        medication.min_hours_between_doses = dto.min_hours_between_doses
        medication.max_daily_doses = dto.max_daily_doses
        medication.reason_for_taking = dto.reason_for_taking
        
        if dto.remaining_doses is not None:
            medication.remaining_doses = dto.remaining_doses

        # Save updates
        updated_medication = self._medication_repository.update(medication)

        # Reschedule notifications
        self._schedule_medication_reminders(updated_medication)

        # Return response
        return self._to_response_dto(updated_medication)

    def record_dose_taken(
        self,
        dto: RecordDoseDTO,
        recorded_by_id: int
    ) -> MedicationResponseDTO:
        """Record that a medication dose was taken"""
        # Get medication
        medication = self._medication_repository.get_by_id(dto.medication_id)
        if not medication:
            raise NotFoundException("Medication not found")

        # Check authorization
        if recorded_by_id != medication.user_id:
            carer = self._carer_repository.get_by_user_id(recorded_by_id)
            if not carer or medication.user_id not in carer.patients:
                raise UnauthorizedError("Not authorized to record doses for this medication")

        # Validate dose can be taken
        if not medication.can_take_dose(dto.taken_at):
            raise ValidationError("Cannot take medication at this time")

        # Record dose
        medication.record_dose_taken(dto.taken_at)
        updated_medication = self._medication_repository.update(medication)

        # Create notification for carers
        self._notify_carers_dose_taken(medication, dto.taken_at)

        # Return response
        return self._to_response_dto(updated_medication)

    def get_due_medications(
        self,
        user_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[MedicationReminderDTO]:
        """Get medications due in a time range"""
        if not start_time:
            start_time = datetime.utcnow()
        if not end_time:
            end_time = start_time + timedelta(days=1)

        medications = self._medication_repository.get_due_medications(
            start_time,
            end_time
        )

        reminders = []
        for medication in medications:
            if medication.user_id != user_id:
                continue

            for dose_time in medication.schedule.dose_times:
                dose_datetime = datetime.strptime(dose_time, "%H:%M").time()
                for day in (start_time.date(), end_time.date()):
                    dose_full_datetime = datetime.combine(day, dose_datetime)
                    if start_time <= dose_full_datetime <= end_time:
                        minutes_until = int(
                            (dose_full_datetime - datetime.utcnow())
                            .total_seconds() / 60
                        )
                        reminders.append(MedicationReminderDTO(
                            medication_id=medication.id,
                            user_id=medication.user_id,
                            scheduled_time=dose_full_datetime,
                            dosage=medication.dosage,
                            is_overdue=minutes_until < 0,
                            minutes_until_due=max(0, minutes_until)
                        ))

        return sorted(reminders, key=lambda r: r.scheduled_time)

    def get_compliance_report(
        self,
        medication_id: int,
        start_date: datetime,
        end_date: datetime,
        user_id: int
    ) -> MedicationComplianceDTO:
        """Get compliance report for a medication"""
        # Get medication
        medication = self._medication_repository.get_by_id(medication_id)
        if not medication:
            raise NotFoundException("Medication not found")

        # Check authorization
        if user_id != medication.user_id:
            carer = self._carer_repository.get_by_user_id(user_id)
            if not carer or medication.user_id not in carer.patients:
                raise UnauthorizedError("Not authorized to view compliance for this medication")

        # Calculate compliance
        doses_scheduled = len(medication.schedule.dose_times) * (
            (end_date - start_date).days + 1
        )
        
        doses_taken = len([
            dose for dose in medication.doses
            if start_date <= dose.taken_at <= end_date
        ])
        
        doses_missed = doses_scheduled - doses_taken
        compliance_rate = (doses_taken / doses_scheduled) if doses_scheduled > 0 else 0

        return MedicationComplianceDTO(
            medication_id=medication_id,
            user_id=medication.user_id,
            start_date=start_date,
            end_date=end_date,
            doses_scheduled=doses_scheduled,
            doses_taken=doses_taken,
            doses_missed=doses_missed,
            compliance_rate=compliance_rate,
            last_taken=medication.last_taken
        )

    def _schedule_medication_reminders(self, medication: Medication):
        """Schedule reminders for a medication"""
        # Cancel existing reminders
        # TODO: Implement reminder cancellation

        # Schedule new reminders
        for dose_time in medication.schedule.dose_times:
            reminder_time = datetime.strptime(dose_time, "%H:%M").time()
            reminder_datetime = datetime.combine(
                datetime.utcnow().date(),
                reminder_time
            )

            # Adjust for reminder_time minutes before dose
            reminder_datetime -= timedelta(minutes=medication.schedule.reminder_time)

            self._notification_service.schedule_notification(
                notification_type="medication_due",
                user_id=medication.user_id,
                scheduled_time=reminder_datetime,
                data={
                    "medication_id": medication.id,
                    "medication_name": medication.name,
                    "dose_time": dose_time,
                    "dosage": medication.dosage.__dict__
                },
                recurring=True,
                recurrence_pattern="daily"
            )

    def _notify_carers_dose_taken(self, medication: Medication, taken_at: datetime):
        """Notify carers when a dose is taken"""
        carers = self._carer_repository.get_for_patient(medication.user_id)
        user = self._user_repository.get_by_id(medication.user_id)

        for carer in carers:
            self._notification_service.create_notification(
                notification_type="medication_taken",
                user_id=carer.user_id,
                data={
                    "medication_id": medication.id,
                    "medication_name": medication.name,
                    "patient_name": user.name,
                    "taken_at": taken_at.isoformat()
                },
                carer_id=carer.id
            )

    def _to_response_dto(self, medication: Medication) -> MedicationResponseDTO:
        """Convert a medication entity to response DTO"""
        return MedicationResponseDTO(
            id=medication.id,
            name=medication.name,
            dosage=medication.dosage,
            schedule=medication.schedule,
            user_id=medication.user_id,
            category=medication.category,
            instructions=medication.instructions,
            is_prn=medication.is_prn,
            min_hours_between_doses=medication.min_hours_between_doses,
            max_daily_doses=medication.max_daily_doses,
            reason_for_taking=medication.reason_for_taking,
            remaining_doses=medication.remaining_doses,
            last_taken=medication.last_taken,
            daily_doses_taken=medication.daily_doses_taken,
            daily_doses_reset_at=medication.daily_doses_reset_at,
            created_at=medication.created_at,
            updated_at=medication.updated_at
        )
