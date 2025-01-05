"""
Medication Schemas
Last Updated: 2024-12-25T22:25:05+01:00
Critical Path: Data Validation
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum

class DosageUnit(str, Enum):
    MG = "mg"
    ML = "ml"
    TABLET = "tablet"
    CAPSULE = "capsule"
    PATCH = "patch"
    SPRAY = "spray"
    DROP = "drop"
    UNIT = "unit"

class MedicationBase(BaseModel):
    """Base medication model."""
    name: str = Field(..., min_length=1, max_length=100)
    dosage: str = Field(..., min_length=1, max_length=50)
    frequency: str = Field(..., min_length=1, max_length=50)
    category: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = None
    reminder_enabled: bool = True
    reminder_time: int = Field(30, ge=0, le=1440)  # minutes before dose
    doses_per_day: Optional[int] = Field(None, ge=0, le=24)
    dose_times: Optional[List[str]] = None
    is_prn: bool = False
    min_hours_between_doses: Optional[int] = Field(None, ge=0, le=72)
    max_daily_doses: Optional[int] = Field(None, ge=0, le=24)
    reason_for_taking: Optional[str] = None
    dosage_unit: DosageUnit
    dosage_value: float = Field(..., gt=0)

    @validator('dose_times', pre=True)
    def validate_dose_times(cls, v):
        if v is None:
            return v
        if not isinstance(v, list):
            raise ValueError('dose_times must be a list')
        for time in v:
            try:
                datetime.strptime(time, '%H:%M')
            except ValueError:
                raise ValueError(f'Invalid time format: {time}. Must be HH:MM')
        return v

class MedicationCreate(MedicationBase):
    """Create medication model."""
    user_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class MedicationUpdate(MedicationBase):
    """Update medication model."""
    pass

class MedicationInDB(MedicationBase):
    """Database medication model."""
    id: int
    user_id: int
    start_date: datetime
    created_at: datetime
    updated_at: datetime
    next_dose: Optional[datetime] = None
    remaining_doses: Optional[int] = None
    last_taken: Optional[datetime] = None
    daily_doses_taken: int = 0
    daily_doses_reset_at: Optional[datetime] = None
    dosage_validated: bool = False
    validation_message: Optional[str] = None

    class Config:
        orm_mode = True
