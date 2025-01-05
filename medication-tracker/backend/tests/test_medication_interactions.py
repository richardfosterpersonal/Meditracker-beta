import pytest
from datetime import datetime, timedelta
import pytz
from app.services.interaction_service import InteractionService
from app.models.medication import Medication
from app.models.interaction import Interaction

def create_test_medication(name, strength, med_type, schedule=None):
    """Helper function to create test medications"""
    if schedule is None:
        schedule = {
            "type": "fixed_time",
            "next_doses": [
                datetime.now(pytz.UTC),
                datetime.now(pytz.UTC) + timedelta(hours=12)
            ]
        }
    
    return Medication(
        name=name,
        strength=strength,
        form="tablet",
        med_type=med_type,
        schedule=schedule
    )

def test_interaction_check_single_medication(test_medication):
    """Test interaction checking for a single medication"""
    checker = InteractionChecker()
    interactions = checker.check_interactions([test_medication])
    
    assert isinstance(interactions, list)
    assert len(interactions) == 0  # No interactions with single medication

def test_interaction_check_multiple_medications(test_user):
    """Test interaction checking for multiple medications"""
    # Create test medications known to interact
    med1 = Medication(
        name="Warfarin",
        description="Blood thinner",
        dosage_form="tablet",
        strength="5mg",
        user_id=test_user.id
    )
    
    med2 = Medication(
        name="Aspirin",
        description="Pain reliever",
        dosage_form="tablet",
        strength="81mg",
        user_id=test_user.id
    )
    
    checker = InteractionChecker()
    interactions = checker.check_interactions([med1, med2])
    
    assert len(interactions) > 0
    interaction = interactions[0]
    assert interaction["severity"] in ["minor", "moderate", "major"]
    assert "description" in interaction
    assert "recommendation" in interaction

def test_interaction_check_with_timing(test_user):
    """Test interaction checking considering medication timing"""
    # Create medications with specific schedules
    med1 = Medication(
        name="Levothyroxine",
        description="Thyroid medication",
        dosage_form="tablet",
        strength="100mcg",
        user_id=test_user.id
    )
    
    med2 = Medication(
        name="Calcium Supplement",
        description="Mineral supplement",
        dosage_form="tablet",
        strength="500mg",
        user_id=test_user.id
    )
    
    # Add schedules
    med1_schedule = {
        "time": "08:00",
        "frequency": "daily"
    }
    
    med2_schedule = {
        "time": "08:00",  # Same time - potential interaction
        "frequency": "daily"
    }
    
    checker = InteractionChecker()
    interactions = checker.check_interactions_with_timing(
        [(med1, med1_schedule), (med2, med2_schedule)]
    )
    
    assert len(interactions) > 0
    assert "timing_recommendation" in interactions[0]

def test_interaction_severity_levels(test_user):
    """Test different interaction severity levels"""
    # Create test medications with known severity levels
    medications = [
        Medication(
            name="Med1",
            description="Test Med 1",
            dosage_form="tablet",
            strength="10mg",
            user_id=test_user.id
        ),
        Medication(
            name="Med2",
            description="Test Med 2",
            dosage_form="tablet",
            strength="20mg",
            user_id=test_user.id
        ),
        Medication(
            name="Med3",
            description="Test Med 3",
            dosage_form="tablet",
            strength="30mg",
            user_id=test_user.id
        )
    ]
    
    checker = InteractionChecker()
    
    # Test each pair
    for i in range(len(medications)):
        for j in range(i + 1, len(medications)):
            interactions = checker.check_interactions(
                [medications[i], medications[j]]
            )
            if interactions:
                assert "severity" in interactions[0]
                assert interactions[0]["severity"] in ["minor", "moderate", "major"]

def test_contraindication_detection(test_user):
    """Test detection of absolute contraindications"""
    med1 = Medication(
        name="MAO Inhibitor",
        description="Antidepressant",
        dosage_form="tablet",
        strength="10mg",
        user_id=test_user.id
    )
    
    med2 = Medication(
        name="SSRI",
        description="Antidepressant",
        dosage_form="tablet",
        strength="20mg",
        user_id=test_user.id
    )
    
    checker = InteractionChecker()
    interactions = checker.check_interactions([med1, med2])
    
    assert len(interactions) > 0
    assert interactions[0]["severity"] == "major"
    assert "contraindicated" in interactions[0]
    assert interactions[0]["contraindicated"] is True

def test_food_interaction_check(test_medication):
    """Test checking for food interactions"""
    checker = InteractionChecker()
    food_interactions = checker.check_food_interactions(test_medication)
    
    assert isinstance(food_interactions, list)
    for interaction in food_interactions:
        assert "food_type" in interaction
        assert "effect" in interaction
        assert "recommendation" in interaction

def test_interaction_database_update(test_user):
    """Test updating interaction database with new information"""
    checker = InteractionChecker()
    
    # Test adding new interaction
    new_interaction = {
        "medication1": "NewDrug1",
        "medication2": "NewDrug2",
        "severity": "moderate",
        "description": "Test interaction",
        "recommendation": "Test recommendation"
    }
    
    checker.add_interaction(new_interaction)
    
    # Verify interaction was added
    med1 = Medication(
        name="NewDrug1",
        description="Test drug 1",
        dosage_form="tablet",
        strength="10mg",
        user_id=test_user.id
    )
    
    med2 = Medication(
        name="NewDrug2",
        description="Test drug 2",
        dosage_form="tablet",
        strength="20mg",
        user_id=test_user.id
    )
    
    interactions = checker.check_interactions([med1, med2])
    assert len(interactions) > 0
    assert interactions[0]["description"] == new_interaction["description"]

@pytest.mark.critical
class TestCriticalInteractions:
    """Test critical interaction scenarios"""
    
    def test_severe_interaction_detection(self, interaction_service):
        """Test detection of severe drug interactions"""
        med1 = create_test_medication("Warfarin", "5mg", "anticoagulant")
        med2 = create_test_medication("Aspirin", "81mg", "antiplatelet")
        
        interaction = interaction_service._check_medication_interaction(med1, med2)
        assert interaction is not None
        assert interaction["level"] == "severe"
        assert "Do not take these medications together" in interaction["warning"]
    
    def test_time_based_interaction(self, interaction_service):
        """Test time-based interaction rules"""
        schedule1 = {
            "type": "fixed_time",
            "next_doses": [datetime(2024, 12, 12, 9, 0)]  # 9 AM
        }
        
        schedule2 = {
            "type": "fixed_time",
            "next_doses": [datetime(2024, 12, 12, 10, 0)]  # 10 AM
        }
        
        conflicts = interaction_service._find_schedule_conflicts(
            schedule1,
            schedule2,
            "severe"  # Severe interactions require 12 hours spacing
        )
        
        assert len(conflicts) > 0
        assert conflicts[0]["hours_apart"] < 12
    
    def test_complex_schedule_interactions(self, interaction_service):
        """Test interactions with complex schedules"""
        schedule1 = {
            "type": "complex",
            "next_doses": [
                {"time": datetime(2024, 12, 12, 9, 0)},
                {"time": datetime(2024, 12, 12, 21, 0)}
            ]
        }
        
        schedule2 = {
            "type": "interval",
            "next_doses": [
                datetime(2024, 12, 12, 8, 0),
                datetime(2024, 12, 12, 14, 0),
                datetime(2024, 12, 12, 20, 0)
            ]
        }
        
        conflicts = interaction_service._find_schedule_conflicts(
            schedule1,
            schedule2,
            "moderate"  # Moderate interactions require 4 hours spacing
        )
        
        assert len(conflicts) > 0
        for conflict in conflicts:
            assert conflict["hours_apart"] < 4
    
    def test_multiple_medication_interactions(self, interaction_service):
        """Test interactions between multiple medications"""
        medications = [
            create_test_medication("Med1", "10mg", "type1"),
            create_test_medication("Med2", "20mg", "type2"),
            create_test_medication("Med3", "30mg", "type3")
        ]
        
        # Set up medication repository mock
        interaction_service.medication_repository.get_active_medications.return_value = medications
        
        warnings = interaction_service.get_interaction_warnings(1)  # user_id = 1
        
        # Verify interaction checks between all medication pairs
        expected_checks = len(medications) * (len(medications) - 1) // 2
        assert len(warnings) <= expected_checks
    
    def test_interaction_severity_escalation(self, interaction_service):
        """Test interaction severity escalation rules"""
        schedule1 = {
            "type": "fixed_time",
            "next_doses": [datetime(2024, 12, 12, 9, 0)]
        }
        
        schedule2 = {
            "type": "fixed_time",
            "next_doses": [datetime(2024, 12, 12, 10, 0)]
        }
        
        # Test different severity levels
        severity_levels = ["mild", "moderate", "severe"]
        expected_spacing = [2, 4, 12]  # hours
        
        for severity, spacing in zip(severity_levels, expected_spacing):
            conflicts = interaction_service._find_schedule_conflicts(
                schedule1,
                schedule2,
                severity
            )
            
            if conflicts:
                assert conflicts[0]["hours_apart"] < spacing

@pytest.mark.critical
class TestMedicationInteractions:
    @pytest.fixture
    def interaction_service(self):
        """Create interaction service with mock data"""
        service = InteractionService()
        
        # Add some mock interactions
        service.add_mock_interaction(
            "Warfarin", "Aspirin", "severe",
            "Risk of severe bleeding when taken together"
        )
        service.add_mock_interaction(
            "Lisinopril", "Potassium", "moderate",
            "May increase potassium levels"
        )
        return service

    @pytest.fixture
    def mock_medications(self):
        """Create mock medications for testing"""
        warfarin = Medication(
            name="Warfarin",
            strength="5mg",
            form="tablet",
            schedule={
                "type": "fixed_time",
                "next_doses": [
                    datetime.now(pytz.UTC),
                    datetime.now(pytz.UTC) + timedelta(hours=12)
                ]
            }
        )
        
        aspirin = Medication(
            name="Aspirin",
            strength="81mg",
            form="tablet",
            schedule={
                "type": "fixed_time",
                "next_doses": [
                    datetime.now(pytz.UTC) + timedelta(hours=1),
                    datetime.now(pytz.UTC) + timedelta(hours=13)
                ]
            }
        )
        
        lisinopril = Medication(
            name="Lisinopril",
            strength="10mg",
            form="tablet",
            schedule={
                "type": "fixed_time",
                "next_doses": [
                    datetime.now(pytz.UTC) + timedelta(hours=6)
                ]
            }
        )
        
        return [warfarin, aspirin, lisinopril]

    @pytest.mark.critical
    def test_severe_interaction_detection(self, interaction_service, mock_medications):
        """Test detection of severe interactions between medications"""
        warfarin = mock_medications[0]
        aspirin = mock_medications[1]
        
        # Check interaction between warfarin and aspirin
        interaction = interaction_service._check_medication_interaction(warfarin, aspirin)
        assert interaction is not None
        assert interaction["level"] == "severe"
        assert "bleeding" in interaction["warning"].lower()

    @pytest.mark.critical
    def test_schedule_conflict_detection(self, interaction_service, mock_medications):
        """Test detection of schedule conflicts for interacting medications"""
        warfarin = mock_medications[0]
        aspirin = mock_medications[1]
        
        # Check schedule conflicts
        conflicts = interaction_service._find_schedule_conflicts(
            warfarin.schedule,
            aspirin.schedule,
            "severe"
        )
        
        assert len(conflicts) > 0
        for conflict in conflicts:
            assert conflict["hours_apart"] < 12  # Severe interactions require 12 hour spacing

    @pytest.mark.critical
    def test_moderate_interaction_detection(self, interaction_service, mock_medications):
        """Test detection of moderate interactions"""
        lisinopril = mock_medications[2]
        
        # Create a mock potassium supplement
        potassium = Medication(
            name="Potassium",
            strength="20mEq",
            form="tablet",
            schedule={
                "type": "fixed_time",
                "next_doses": [
                    datetime.now(pytz.UTC) + timedelta(hours=2)
                ]
            }
        )
        
        # Check interaction
        interaction = interaction_service._check_medication_interaction(lisinopril, potassium)
        assert interaction is not None
        assert interaction["level"] == "moderate"
        assert "potassium" in interaction["description"].lower()

    @pytest.mark.critical
    def test_multiple_medication_interactions(self, interaction_service, mock_medications):
        """Test checking interactions across multiple medications"""
        class MockRepo:
            def __init__(self, meds):
                self.get_active_medications = meds
        
        interaction_service.medication_repository = MockRepo(mock_medications)
        
        # Check all interactions
        warnings = interaction_service.get_interaction_warnings(user_id=1)
        
        # Should find at least the severe warfarin-aspirin interaction
        assert len(warnings) >= 1
        severe_warnings = [w for w in warnings if w["level"] == "severe"]
        assert len(severe_warnings) >= 1
        assert any("Warfarin" in w["medication1"] and "Aspirin" in w["medication2"] 
                  or "Aspirin" in w["medication1"] and "Warfarin" in w["medication2"] 
                  for w in severe_warnings)

    @pytest.mark.critical
    def test_schedule_based_warnings(self, interaction_service, mock_medications):
        """Test generation of schedule-based interaction warnings"""
        warfarin = mock_medications[0]
        aspirin = mock_medications[1]
        
        # Set up mock repository
        class MockRepo:
            def get_active_medications(self, user_id=None, exclude_id=None):
                return [aspirin]
                
            def get_by_id(self, id):
                return warfarin
        
        interaction_service.medication_repository = MockRepo()
        
        # Check for schedule-based warnings
        warnings = interaction_service.check_schedule_interactions(
            user_id=1,
            medication_id=1,  # warfarin's id
            new_schedule=warfarin.schedule
        )
        
        assert len(warnings) > 0
        warning = warnings[0]
        assert warning["medication_name"] == "Aspirin"
        assert warning["interaction_level"] == "severe"
        assert len(warning["conflicts"]) > 0
        
        # Verify conflict times
        for conflict in warning["conflicts"]:
            assert "time1" in conflict
            assert "time2" in conflict
            assert "hours_apart" in conflict
            assert conflict["hours_apart"] < 12  # Should be less than minimum spacing for severe
