"""
Test Data Generator
Last Updated: 2024-12-25T12:02:50+01:00
Permission: IMPLEMENTATION
Reference: MASTER_CRITICAL_PATH.md
"""

from typing import Dict, List
from datetime import datetime, timedelta
import random
from dataclasses import dataclass
import json

@dataclass
class TestMedication:
    name: str
    dosage: str
    frequency: str
    interactions: List[str]
    conditions: List[str]

class TestDataGenerator:
    """Generates test data for critical path validation"""
    
    def __init__(self):
        self.medications = self._load_medication_data()
        self.conditions = self._load_condition_data()
    
    def _load_medication_data(self) -> List[TestMedication]:
        """Load base medication data for testing"""
        # Common medications with known interactions
        return [
            TestMedication(
                name="Metformin",
                dosage="500mg",
                frequency="Daily",
                interactions=["Furosemide", "Nifedipine"],
                conditions=["Diabetes"]
            ),
            TestMedication(
                name="Lisinopril",
                dosage="10mg",
                frequency="Daily",
                interactions=["Spironolactone", "NSAIDs"],
                conditions=["Hypertension"]
            ),
            TestMedication(
                name="Levothyroxine",
                dosage="100mcg",
                frequency="Daily",
                interactions=["Calcium", "Iron"],
                conditions=["Hypothyroidism"]
            )
        ]
    
    def _load_condition_data(self) -> List[str]:
        """Load medical conditions for testing"""
        return [
            "Diabetes",
            "Hypertension",
            "Hypothyroidism",
            "Asthma",
            "Heart Disease"
        ]
    
    def generate_schedule(self, days: int = 7) -> Dict:
        """Generate medication schedule for testing"""
        schedule = {}
        start_date = datetime.now()
        
        for day in range(days):
            date = start_date + timedelta(days=day)
            schedule[date.strftime("%Y-%m-%d")] = self._generate_daily_schedule()
        
        return schedule
    
    def _generate_daily_schedule(self) -> List[Dict]:
        """Generate single day schedule"""
        schedule = []
        medications = random.sample(self.medications, 2)  # 2 meds per day
        
        for med in medications:
            times = self._generate_med_times(med.frequency)
            for time in times:
                schedule.append({
                    "medication": med.name,
                    "dosage": med.dosage,
                    "time": time,
                    "taken": False
                })
        
        return schedule
    
    def _generate_med_times(self, frequency: str) -> List[str]:
        """Generate medication times based on frequency"""
        if frequency == "Daily":
            return ["08:00"]
        elif frequency == "Twice Daily":
            return ["08:00", "20:00"]
        return ["08:00"]  # Default
    
    def generate_interaction_test(self) -> Dict:
        """Generate data for interaction testing"""
        # Select medications with known interactions
        med1 = random.choice(self.medications)
        med2 = random.choice([m for m in self.medications 
                            if m.name in med1.interactions])
        
        return {
            "primary_med": {
                "name": med1.name,
                "dosage": med1.dosage
            },
            "interacting_med": {
                "name": med2.name,
                "dosage": med2.dosage
            },
            "expected_alert": True
        }
    
    def generate_error_test(self) -> Dict:
        """Generate data for error prevention testing"""
        med = random.choice(self.medications)
        
        return {
            "medication": med.name,
            "scenarios": [
                {
                    "type": "double_dose",
                    "dosage": f"{float(med.dosage.replace('mg',''))*2}mg",
                    "expected_alert": True
                },
                {
                    "type": "wrong_time",
                    "time": "03:00",  # Unusual time
                    "expected_alert": True
                },
                {
                    "type": "missed_dose",
                    "delay_hours": 4,
                    "expected_alert": True
                }
            ]
        }
    
    def generate_security_test(self) -> Dict:
        """Generate data for security testing"""
        return {
            "phi_data": {
                "patient_id": "TEST_P12345",
                "conditions": random.sample(self.conditions, 2),
                "medications": [m.name for m in 
                              random.sample(self.medications, 2)]
            },
            "access_levels": [
                "READ",
                "WRITE",
                "ADMIN"
            ],
            "expected_encryption": True
        }
