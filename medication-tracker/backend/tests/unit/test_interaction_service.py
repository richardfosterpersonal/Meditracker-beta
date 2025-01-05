import pytest
from datetime import datetime, timedelta
from app.services.interaction_service import InteractionService
from app.models.medication import Medication

@pytest.fixture
def interaction_service():
    return InteractionService()

@pytest.fixture
def sample_medications():
    return [
        Medication(
            id=1,
            name="Warfarin",
            dosage="5mg",
            schedule={
                "type": "fixed_time",
                "times": ["09:00", "21:00"]
            }
        ),
        Medication(
            id=2,
            name="Aspirin",
            dosage="81mg",
            schedule={
                "type": "fixed_time",
                "times": ["09:00"]
            }
        )
    ]

class TestInteractionService:
    def test_severe_interaction_detection(self, interaction_service, sample_medications):
        """Test detection of severe drug interactions"""
        # Set up a known severe interaction
        interaction_service._mock_interactions = {
            ("Warfarin", "Aspirin"): {
                "level": "severe",
                "description": "Increased risk of bleeding"
            }
        }
        
        interactions = interaction_service.check_interactions(
            sample_medications[0],  # Warfarin
            [sample_medications[1]]  # Aspirin
        )
        
        assert len(interactions) == 1
        assert interactions[0]["level"] == "severe"
        assert "bleeding" in interactions[0]["description"].lower()
        assert interactions[0]["requires_override"] is True
        assert interactions[0]["notify_provider"] is True

    def test_schedule_based_interaction(self, interaction_service, sample_medications):
        """Test interaction detection based on medication schedules"""
        warfarin = sample_medications[0]
        aspirin = sample_medications[1]
        
        # Both medications scheduled for 09:00
        interactions = interaction_service.check_interactions(warfarin, [aspirin])
        schedule_conflict = any(
            i["warning"].lower().startswith("medications scheduled")
            for i in interactions
        )
        assert schedule_conflict, "Should detect medications scheduled for same time"

    def test_moderate_interaction_spacing(self, interaction_service):
        """Test moderate interaction with timing requirements"""
        med1 = Medication(
            id=1,
            name="Med1",
            dosage="10mg",
            schedule={"type": "fixed_time", "times": ["09:00"]}
        )
        med2 = Medication(
            id=2,
            name="Med2",
            dosage="20mg",
            schedule={"type": "fixed_time", "times": ["10:00"]}
        )
        
        interaction_service._mock_interactions = {
            ("Med1", "Med2"): {
                "level": "moderate",
                "description": "Space medications by 4 hours"
            }
        }
        
        interactions = interaction_service.check_interactions(med1, [med2])
        assert len(interactions) == 1
        assert interactions[0]["level"] == "moderate"
        assert interactions[0]["min_spacing_hours"] == 4

    def test_prn_medication_interactions(self, interaction_service):
        """Test interactions with PRN (as needed) medications"""
        regular_med = Medication(
            id=1,
            name="RegularMed",
            dosage="10mg",
            schedule={"type": "fixed_time", "times": ["09:00"]}
        )
        prn_med = Medication(
            id=2,
            name="PRNMed",
            dosage="20mg",
            schedule={"type": "prn", "max_daily_doses": 3}
        )
        
        interaction_service._mock_interactions = {
            ("RegularMed", "PRNMed"): {
                "level": "mild",
                "description": "Monitor for side effects"
            }
        }
        
        interactions = interaction_service.check_interactions(regular_med, [prn_med])
        assert len(interactions) == 1
        assert "prn" in interactions[0]["warning"].lower()
        assert interactions[0]["level"] == "mild"

    def test_time_zone_handling(self, interaction_service):
        """Test interaction checks across different time zones"""
        med_utc = Medication(
            id=1,
            name="MedUTC",
            dosage="10mg",
            schedule={
                "type": "fixed_time",
                "times": ["09:00"],
                "timezone": "UTC"
            }
        )
        med_est = Medication(
            id=2,
            name="MedEST",
            dosage="20mg",
            schedule={
                "type": "fixed_time",
                "times": ["09:00"],
                "timezone": "America/New_York"
            }
        )
        
        interactions = interaction_service.check_interactions(med_utc, [med_est])
        # Should not flag as concurrent since these are in different time zones
        schedule_conflict = any(
            i["warning"].lower().startswith("medications scheduled")
            for i in interactions
        )
        assert not schedule_conflict, "Should handle different time zones correctly"
