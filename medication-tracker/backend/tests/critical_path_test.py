import pytest
from datetime import datetime, timedelta
from app.services.medication_reference_service import medication_reference_service
from app.services.schedule_service import schedule_service
from app.services.medication_service import medication_service
from app.models.medication import Medication, Schedule
from app.models.errors import ValidationError, ConflictError

@pytest.mark.critical
class TestCriticalPath:
    """Critical path tests focusing on medication safety and core functionality"""

    @pytest.mark.asyncio
    async def test_medication_dosage_validation(self):
        """Verify medication dosage validation prevents unsafe doses"""
        # Test common medication with known safe dosage range
        medication = {
            "name": "Acetaminophen",
            "form": "tablet",
            "strength": "500mg",
            "schedule": {
                "type": "fixed_time",
                "times": ["09:00", "15:00", "21:00"],
                "dose": 1
            }
        }
        
        # Should pass - within safe limits
        assert await medication_service.validate_medication(medication) is True
        
        # Should fail - exceeds max daily dose
        unsafe_medication = medication.copy()
        unsafe_medication["schedule"]["times"].extend(["03:00", "06:00", "12:00", "18:00", "00:00"])
        
        with pytest.raises(ValidationError, match="exceeds maximum daily dose"):
            await medication_service.validate_medication(unsafe_medication)

    @pytest.mark.asyncio
    async def test_drug_interaction_detection(self):
        """Verify detection of known drug interactions"""
        # Setup medications known to interact
        med1 = await medication_service.create_medication({
            "name": "Warfarin",
            "form": "tablet",
            "strength": "5mg",
            "schedule": {"type": "fixed_time", "times": ["09:00"], "dose": 1}
        })
        
        med2 = {
            "name": "Aspirin",
            "form": "tablet",
            "strength": "81mg",
            "schedule": {"type": "fixed_time", "times": ["09:00"], "dose": 1}
        }
        
        # Should detect known interaction
        with pytest.raises(ConflictError, match="potentially dangerous interaction"):
            await medication_service.validate_medication_combination([med1, med2])

    @pytest.mark.asyncio
    async def test_schedule_conflict_prevention(self):
        """Verify prevention of unsafe medication scheduling"""
        # Create base schedule
        base_med = await medication_service.create_medication({
            "name": "Med1",
            "form": "tablet",
            "strength": "10mg",
            "schedule": {
                "type": "fixed_time",
                "times": ["09:00"],
                "dose": 1
            }
        })
        
        # Attempt to schedule another medication too close
        conflicting_schedule = {
            "name": "Med2",
            "form": "tablet",
            "strength": "10mg",
            "schedule": {
                "type": "fixed_time",
                "times": ["09:15"],  # Too close to previous medication
                "dose": 1
            }
        }
        
        with pytest.raises(ConflictError, match="schedule conflict"):
            await schedule_service.validate_schedule_combination(
                base_med.schedule,
                conflicting_schedule["schedule"]
            )

    @pytest.mark.asyncio
    async def test_schedule_adjustment_safety(self):
        """Verify safe adjustment of medication schedules"""
        # Create initial medication schedule
        med = await medication_service.create_medication({
            "name": "TestMed",
            "form": "tablet",
            "strength": "10mg",
            "schedule": {
                "type": "interval",
                "interval_hours": 8,
                "dose": 1
            }
        })
        
        # Test safe adjustment
        safe_adjustment = {
            "type": "interval",
            "interval_hours": 12,
            "dose": 1
        }
        
        assert await schedule_service.validate_schedule_adjustment(
            med.id,
            safe_adjustment
        ) is True
        
        # Test unsafe adjustment
        unsafe_adjustment = {
            "type": "interval",
            "interval_hours": 2,  # Too frequent
            "dose": 1
        }
        
        with pytest.raises(ValidationError, match="minimum interval"):
            await schedule_service.validate_schedule_adjustment(
                med.id,
                unsafe_adjustment
            )

    @pytest.mark.asyncio
    async def test_medication_form_compatibility(self):
        """Verify medication form and dosage compatibility"""
        # Test compatible form and dosage
        assert await medication_reference_service.validate_form_dosage(
            form="tablet",
            dosage="500mg"
        ) is True
        
        # Test incompatible form and dosage
        with pytest.raises(ValidationError, match="invalid dosage for form"):
            await medication_reference_service.validate_form_dosage(
                form="tablet",
                dosage="5ml"
            )

    @pytest.mark.asyncio
    async def test_critical_update_flow(self):
        """Verify critical update path maintains data consistency"""
        # Create initial medication
        med = await medication_service.create_medication({
            "name": "UpdateTestMed",
            "form": "tablet",
            "strength": "10mg",
            "schedule": {
                "type": "fixed_time",
                "times": ["09:00"],
                "dose": 1
            }
        })
        
        # Update schedule
        new_schedule = {
            "type": "fixed_time",
            "times": ["10:00"],
            "dose": 1
        }
        
        updated_med = await medication_service.update_medication(
            med.id,
            {"schedule": new_schedule}
        )
        
        # Verify consistency
        assert updated_med.schedule.times == ["10:00"]
        assert updated_med.version > med.version
        
        # Verify history tracking
        history = await medication_service.get_medication_history(med.id)
        assert len(history) > 0
        assert history[0]["change_type"] == "schedule_update"
