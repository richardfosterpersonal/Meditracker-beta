import pytest
from app.services.medication_validation_service import (
    MedicationValidationService,
    TimeOfDay,
    DosageUnit
)

@pytest.fixture
def validator():
    return MedicationValidationService()

class TestDosageValidation:
    def test_valid_tablet_dosages(self, validator):
        """Test validation of common tablet dosages"""
        valid_dosages = [
            "1 tablet",
            "2 tablets",
            "50 mg",
            "100 mg",
            "500 mg"
        ]
        
        for dosage in valid_dosages:
            is_valid, message, _ = validator.validate_dosage("Test Med", dosage, "1 time per day")
            assert is_valid, f"Expected {dosage} to be valid: {message}"

    def test_invalid_tablet_dosages(self, validator):
        """Test validation of unusual tablet dosages"""
        invalid_dosages = [
            "10 tablets",  # Too many tablets
            "5000 mg",    # Unusually high dose
            "0.1 tablets" # Partial tablets not common
        ]
        
        for dosage in invalid_dosages:
            is_valid, message, suggestions = validator.validate_dosage("Test Med", dosage, "1 time per day")
            assert not is_valid, f"Expected {dosage} to be invalid"
            assert suggestions, "Should provide alternative suggestions"

    def test_liquid_medication_validation(self, validator):
        """Test validation of liquid medication dosages"""
        # Valid liquid dosages
        assert validator.validate_dosage("Cough Syrup", "10 ml", "2 times per day")[0]
        assert validator.validate_dosage("Liquid Medicine", "5 ml", "3 times per day")[0]
        
        # Invalid liquid dosages
        is_valid, message, suggestions = validator.validate_dosage("Cough Syrup", "500 ml", "1 time per day")
        assert not is_valid
        assert "high volume" in message.lower()
        assert any("ml" in sugg for sugg in suggestions)

    def test_injection_validation(self, validator):
        """Test validation of injection dosages"""
        # Valid injection volumes
        assert validator.validate_dosage("Insulin", "0.5 ml", "3 times per day")[0]
        assert validator.validate_dosage("Vaccine", "1 ml", "1 time per day")[0]
        
        # Invalid injection volumes
        is_valid, message, suggestions = validator.validate_dosage("Injection", "10 ml", "1 time per day")
        assert not is_valid
        assert suggestions
        assert all(float(sugg.split()[0]) <= 5 for sugg in suggestions if "ml" in sugg)

class TestFrequencyValidation:
    def test_valid_frequencies(self, validator):
        """Test validation of common frequencies"""
        test_cases = [
            ("1 time per day", [TimeOfDay.MORNING]),
            ("2 times per day", [TimeOfDay.MORNING, TimeOfDay.EVENING]),
            ("3 times per day", [TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.EVENING]),
            ("4 times per day", [TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.AFTERNOON, TimeOfDay.EVENING])
        ]
        
        for frequency, times in test_cases:
            is_valid, message = validator.validate_frequency(frequency, times)
            assert is_valid, f"Expected {frequency} to be valid with {len(times)} times: {message}"

    def test_mismatched_frequencies(self, validator):
        """Test validation when frequency doesn't match times of day"""
        test_cases = [
            ("2 times per day", [TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.EVENING]),
            ("3 times per day", [TimeOfDay.MORNING, TimeOfDay.EVENING]),
            ("1 time per day", [TimeOfDay.MORNING, TimeOfDay.EVENING])
        ]
        
        for frequency, times in test_cases:
            is_valid, message = validator.validate_frequency(frequency, times)
            assert not is_valid
            assert "does not match" in message.lower()

    def test_prn_validation(self, validator):
        """Test validation of PRN (as needed) frequencies"""
        is_valid, message = validator.validate_frequency("PRN", [])
        assert is_valid
        assert "PRN" in message

    def test_excessive_frequencies(self, validator):
        """Test validation of unusually high frequencies"""
        test_cases = [
            "7 times per day",
            "3 times per hour",
            "5 times per minute"
        ]
        
        for frequency in test_cases:
            is_valid, message = validator.validate_frequency(frequency, [])
            assert not is_valid
            assert "exceeds maximum" in message.lower()

class TestDosageSuggestions:
    def test_tablet_suggestions(self, validator):
        """Test suggestions for tablet medications"""
        _, _, suggestions = validator.validate_dosage("Pain Reliever", "1000 mg", "1 time per day")
        assert suggestions
        assert any("500 mg" in sugg for sugg in suggestions)
        assert any("100 mg" in sugg for sugg in suggestions)

    def test_liquid_suggestions(self, validator):
        """Test suggestions for liquid medications"""
        _, _, suggestions = validator.validate_dosage("Cough Syrup", "100 ml", "1 time per day")
        assert suggestions
        assert any("5 ml" in sugg for sugg in suggestions)
        assert any("10 ml" in sugg for sugg in suggestions)

    def test_context_aware_suggestions(self, validator):
        """Test that suggestions are appropriate for medication type"""
        # For syrup
        _, _, syrup_suggestions = validator.validate_dosage("Cough Syrup", "invalid", "1 time per day")
        assert any("ml" in sugg for sugg in syrup_suggestions)
        
        # For inhaler
        _, _, inhaler_suggestions = validator.validate_dosage("Asthma Inhaler", "invalid", "1 time per day")
        assert any("puff" in sugg.lower() for sugg in inhaler_suggestions)
        
        # For tablets
        _, _, tablet_suggestions = validator.validate_dosage("Pain Tablet", "invalid", "1 time per day")
        assert any("mg" in sugg for sugg in tablet_suggestions)

class TestCriticalPath:
    @pytest.mark.critical
    def test_complex_schedule_validation(self, validator):
        """Test validation of complex medication schedules"""
        schedule = {
            "type": "complex",
            "pattern": [
                {"days": [1, 3, 5], "times": ["09:00"], "dose": "10mg"},
                {"days": [2, 4, 6], "times": ["15:00"], "dose": "5mg"}
            ]
        }
        
        is_valid, message = validator.validate_schedule(schedule)
        assert is_valid, f"Valid complex schedule rejected: {message}"
        
        # Test invalid complex schedule (overlapping times)
        invalid_schedule = {
            "type": "complex",
            "pattern": [
                {"days": [1, 3, 5], "times": ["09:00"], "dose": "10mg"},
                {"days": [1, 3, 5], "times": ["09:00"], "dose": "5mg"}
            ]
        }
        
        is_valid, message = validator.validate_schedule(invalid_schedule)
        assert not is_valid
        assert "overlapping times" in message.lower()

    @pytest.mark.critical
    def test_schedule_interaction_validation(self, validator):
        """Test validation of schedule interactions"""
        schedule1 = {
            "type": "fixed_time",
            "times": ["09:00"],
            "dose": "10mg"
        }
        
        schedule2 = {
            "type": "fixed_time",
            "times": ["09:30"],  # Too close to schedule1
            "dose": "20mg"
        }
        
        is_valid, message = validator.validate_schedule_combination(schedule1, schedule2)
        assert not is_valid
        assert "minimum spacing" in message.lower()
        
        # Test valid schedule combination
        safe_schedule = {
            "type": "fixed_time",
            "times": ["15:00"],  # Safe spacing
            "dose": "20mg"
        }
        
        is_valid, message = validator.validate_schedule_combination(schedule1, safe_schedule)
        assert is_valid, f"Valid schedule combination rejected: {message}"

    @pytest.mark.critical
    def test_edge_case_dosages(self, validator):
        """Test validation of edge case dosages"""
        edge_cases = [
            ("999mg", True),   # Just under limit
            ("1001mg", False), # Just over limit
            ("0.5mg", True),   # Small but valid dose
            ("0.001mg", False) # Too small to be practical
        ]
        
        for dosage, expected_valid in edge_cases:
            is_valid, message, _ = validator.validate_dosage("Test Med", dosage, "1 time per day")
            assert is_valid == expected_valid, f"Unexpected validation result for {dosage}: {message}"

    @pytest.mark.critical
    def test_cross_unit_validation(self, validator):
        """Test validation across different unit types"""
        conversions = [
            ("1000mg", "1g"),      # Equal amounts
            ("1ml", "20 drops"),   # Equivalent liquid measures
            ("2 tablets", "1000mg") # Different unit types
        ]
        
        for dose1, dose2 in conversions:
            valid1, msg1, _ = validator.validate_dosage("Test Med", dose1, "daily")
            valid2, msg2, _ = validator.validate_dosage("Test Med", dose2, "daily")
            assert valid1 == valid2, f"Inconsistent validation between {dose1} and {dose2}"
