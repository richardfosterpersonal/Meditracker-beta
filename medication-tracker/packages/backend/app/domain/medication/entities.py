from datetime import datetime, timedelta
from typing import List, Optional, Dict
from dataclasses import dataclass
from app.domain.shared.base_entity import BaseEntity

@dataclass
class Dosage:
    amount: str
    unit: str
    frequency: str
    times_per_day: int
    specific_times: List[str]

@dataclass
class Schedule:
    start_date: datetime
    end_date: Optional[datetime]
    reminder_time: int  # minutes before dose
    dose_times: List[str]
    timezone: str

class MedicationEntity(BaseEntity):
    def __init__(
        self,
        name: str,
        dosage: Dosage,
        schedule: Schedule,
        user_id: int,
        category: Optional[str] = None,
        instructions: Optional[str] = None,
        is_prn: bool = False,
        min_hours_between_doses: Optional[int] = None,
        max_daily_doses: Optional[int] = None,
        reason_for_taking: Optional[str] = None
    ):
        super().__init__()
        self.name = name
        self.dosage = dosage
        self.schedule = schedule
        self.user_id = user_id
        self.category = category
        self.instructions = instructions
        self.is_prn = is_prn
        self.min_hours_between_doses = min_hours_between_doses
        self.max_daily_doses = max_daily_doses
        self.reason_for_taking = reason_for_taking
        self.remaining_doses: Optional[int] = None
        self.last_taken: Optional[datetime] = None
        self.daily_doses_taken: int = 0
        self.daily_doses_reset_at: Optional[datetime] = None

    def can_take_dose(self, current_time: datetime) -> bool:
        if not self.is_prn:
            return True
            
        if self.max_daily_doses and self.daily_doses_taken >= self.max_daily_doses:
            return False
            
        if self.last_taken and self.min_hours_between_doses:
            time_since_last = current_time - self.last_taken
            if time_since_last < timedelta(hours=self.min_hours_between_doses):
                return False
                
        return True

    def record_dose_taken(self, taken_at: datetime):
        self.last_taken = taken_at
        if self.remaining_doses is not None:
            self.remaining_doses -= 1
        
        if self.is_prn:
            self.daily_doses_taken += 1
            
        if (not self.daily_doses_reset_at or 
            taken_at.date() > self.daily_doses_reset_at.date()):
            self.daily_doses_taken = 1
            self.daily_doses_reset_at = taken_at

    def needs_refill(self, threshold: int = 7) -> bool:
        if self.remaining_doses is None:
            return False
        return self.remaining_doses <= threshold

# Alias for backward compatibility
Medication = MedicationEntity
