from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from .base import BaseDTO, BaseResponseDTO

@dataclass
class DosageDTO:
    amount: str
    unit: str
    frequency: str
    times_per_day: int
    specific_times: List[str]

@dataclass
class ScheduleDTO:
    start_date: datetime
    end_date: Optional[datetime]
    reminder_time: int  # minutes before dose
    dose_times: List[str]
    timezone: str

@dataclass
class CreateMedicationDTO(BaseDTO):
    name: str
    dosage: DosageDTO
    schedule: ScheduleDTO
    user_id: int
    category: Optional[str] = None
    instructions: Optional[str] = None
    is_prn: bool = False
    min_hours_between_doses: Optional[int] = None
    max_daily_doses: Optional[int] = None
    reason_for_taking: Optional[str] = None
    remaining_doses: Optional[int] = None

@dataclass
class UpdateMedicationDTO(CreateMedicationDTO):
    pass

@dataclass
class MedicationResponseDTO(BaseResponseDTO):
    name: str
    dosage: DosageDTO
    schedule: ScheduleDTO
    user_id: int
    category: Optional[str]
    instructions: Optional[str]
    is_prn: bool
    min_hours_between_doses: Optional[int]
    max_daily_doses: Optional[int]
    reason_for_taking: Optional[str]
    remaining_doses: Optional[int]
    last_taken: Optional[datetime]
    daily_doses_taken: int
    daily_doses_reset_at: Optional[datetime]

@dataclass
class RecordDoseDTO(BaseDTO):
    medication_id: int
    taken_at: datetime
    recorded_by_id: Optional[int] = None
    notes: Optional[str] = None

@dataclass
class MedicationComplianceDTO(BaseDTO):
    medication_id: int
    user_id: int
    start_date: datetime
    end_date: datetime
    doses_scheduled: int
    doses_taken: int
    doses_missed: int
    compliance_rate: float
    last_taken: Optional[datetime]

@dataclass
class MedicationReminderDTO(BaseDTO):
    medication_id: int
    user_id: int
    scheduled_time: datetime
    dosage: DosageDTO
    is_overdue: bool
    minutes_until_due: int
