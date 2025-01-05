from app.domain.medication.entities import (
    Medication as MedicationEntity,
    Dosage,
    Schedule
)
from app.infrastructure.database.models import Medication
from .base_mapper import BaseMapper

class MedicationMapper(BaseMapper[MedicationEntity, Medication]):
    def to_entity(self, model: Medication) -> MedicationEntity:
        if not model:
            return None
            
        dosage_data = model.dosage
        schedule_data = model.schedule
        
        dosage = Dosage(
            amount=dosage_data['amount'],
            unit=dosage_data['unit'],
            frequency=dosage_data['frequency'],
            times_per_day=dosage_data['times_per_day'],
            specific_times=dosage_data['specific_times']
        )
        
        schedule = Schedule(
            start_date=schedule_data['start_date'],
            end_date=schedule_data.get('end_date'),
            reminder_time=schedule_data['reminder_time'],
            dose_times=schedule_data['dose_times'],
            timezone=schedule_data['timezone']
        )
        
        medication = MedicationEntity(
            name=model.name,
            dosage=dosage,
            schedule=schedule,
            user_id=model.user_id,
            category=model.category,
            instructions=model.instructions,
            is_prn=model.is_prn,
            min_hours_between_doses=model.min_hours_between_doses,
            max_daily_doses=model.max_daily_doses,
            reason_for_taking=model.reason_for_taking,
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
        
        medication.remaining_doses = model.remaining_doses
        medication.last_taken = model.last_taken
        medication.daily_doses_taken = model.daily_doses_taken
        medication.daily_doses_reset_at = model.daily_doses_reset_at
        
        return medication

    def to_model(self, entity: MedicationEntity) -> Medication:
        if not entity:
            return None
            
        return Medication(
            id=entity.id,
            name=entity.name,
            dosage={
                'amount': entity.dosage.amount,
                'unit': entity.dosage.unit,
                'frequency': entity.dosage.frequency,
                'times_per_day': entity.dosage.times_per_day,
                'specific_times': entity.dosage.specific_times
            },
            schedule={
                'start_date': entity.schedule.start_date,
                'end_date': entity.schedule.end_date,
                'reminder_time': entity.schedule.reminder_time,
                'dose_times': entity.schedule.dose_times,
                'timezone': entity.schedule.timezone
            },
            user_id=entity.user_id,
            category=entity.category,
            instructions=entity.instructions,
            is_prn=entity.is_prn,
            min_hours_between_doses=entity.min_hours_between_doses,
            max_daily_doses=entity.max_daily_doses,
            reason_for_taking=entity.reason_for_taking,
            remaining_doses=entity.remaining_doses,
            last_taken=entity.last_taken,
            daily_doses_taken=entity.daily_doses_taken,
            daily_doses_reset_at=entity.daily_doses_reset_at,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
