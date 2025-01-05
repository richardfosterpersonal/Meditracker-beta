"""
Beta Testing Schemas
Last Updated: 2024-12-27T22:27:33+01:00
Critical Path: Beta.Schemas
"""

from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class BetaRegistration(BaseModel):
    """Simple beta registration"""
    email: EmailStr
    name: str

class BetaFeature(BaseModel):
    """Available beta feature"""
    name: str
    description: str
    status: str
    endpoints: List[str]

class MedicationEntry(BaseModel):
    """Simple medication entry for beta"""
    name: str
    dosage: str
    frequency: str
    time_of_day: Optional[List[str]] = None
    notes: Optional[str] = None

class BetaFeedback(BaseModel):
    """Beta feedback submission"""
    feature: str
    feedback: str
    rating: Optional[int] = None
    timestamp: datetime = datetime.now()

class EmergencyContact(BaseModel):
    """Emergency contact for beta"""
    name: str
    phone: str
    relationship: str
    notify_on_missed: bool = True

class Reminder(BaseModel):
    """Simple medication reminder"""
    medication_name: str
    time: str
    message: Optional[str] = None
