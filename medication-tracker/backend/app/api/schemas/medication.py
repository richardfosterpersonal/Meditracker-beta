from datetime import datetime, time
from typing import List, Optional
from pydantic import BaseModel, Field

class DosageBase(BaseModel):
    amount: float = Field(..., gt=0)
    unit: str
    frequency: str
    times_per_day: int = Field(..., gt=0)
    specific_times: List[str]

class ScheduleBase(BaseModel):
    start_date: datetime
    end_date: Optional[datetime] = None
    reminder_time: int  # minutes before dose
    dose_times: List[str]
    timezone: str = "UTC"

class MedicationBase(BaseModel):
    name: str
    dosage: DosageBase
    schedule: ScheduleBase
    category: Optional[str] = None
    instructions: Optional[str] = None
    is_prn: bool = False
    min_hours_between_doses: Optional[int] = None
    max_daily_doses: Optional[int] = None
    reason_for_taking: Optional[str] = None
    remaining_doses: Optional[int] = None

class MedicationCreate(MedicationBase):
    user_id: int

class MedicationUpdate(MedicationBase):
    pass

class MedicationResponse(MedicationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    last_taken: Optional[datetime] = None
    daily_doses_taken: int = 0
    daily_doses_reset_at: Optional[datetime] = None

    class Config:
        from_attributes = True
