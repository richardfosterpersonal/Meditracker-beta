import unittest
from datetime import datetime, timedelta
from app.services.schedule_adjustment import ScheduleAdjustment
from app.models import Schedule, TimeSlot

class TestScheduleAdjustment(unittest.TestCase):
    def setUp(self):
        self.adjuster = ScheduleAdjustment()
        self.base_time = datetime(2024, 1, 1, 8, 0)  # 8:00 AM
        
        # Create some existing schedules
        self.existing_schedules = [
            Schedule(
                type="fixed_time",
                time_slots=[
                    TimeSlot(time=self.base_time),
                    TimeSlot(time=self.base_time + timedelta(hours=12))
                ]
            )
        ]

    def test_fixed_time_adjustment_suggestions(self):
        """Test suggestions for fixed-time schedule conflicts."""
        conflicting_schedule = Schedule(
            type="fixed_time",
            time_slots=[TimeSlot(time=self.base_time)]  # Conflicts with existing
        )
        
        suggestions = self.adjuster.suggest_adjustments(
            conflicting_schedule,
            self.existing_schedules
        )
        
        self.assertTrue(len(suggestions) > 0)
        for suggestion in suggestions:
            self.assertIn("type", suggestion)
            self.assertIn("description", suggestion)
            self.assertIn("original_time", suggestion)
            self.assertIn("suggested_time", suggestion)

    def test_interval_adjustment_suggestions(self):
        """Test suggestions for interval-based schedule conflicts."""
        conflicting_schedule = Schedule(
            type="interval",
            interval_hours=12
        )
        
        suggestions = self.adjuster.suggest_adjustments(
            conflicting_schedule,
            self.existing_schedules
        )
        
        self.assertTrue(len(suggestions) > 0)
        for suggestion in suggestions:
            self.assertIn("type", suggestion)
            self.assertIn("description", suggestion)
            self.assertIn("original_interval", suggestion)
            self.assertIn("suggested_interval", suggestion)

    def test_meal_based_adjustment_suggestions(self):
        """Test suggestions for meal-based schedule conflicts."""
        meal_time = self.base_time
        conflicting_schedule = Schedule(
            type="meal_based",
            meal_time=meal_time,
            time_offset=0  # Conflicts with existing
        )
        
        suggestions = self.adjuster.suggest_adjustments(
            conflicting_schedule,
            self.existing_schedules
        )
        
        self.assertTrue(len(suggestions) > 0)
        for suggestion in suggestions:
            self.assertIn("type", suggestion)
            self.assertIn("description", suggestion)
            self.assertIn("original_offset", suggestion)
            self.assertIn("suggested_offset", suggestion)

    def test_no_conflicts_returns_empty_suggestions(self):
        """Test that no suggestions are returned when there are no conflicts."""
        non_conflicting_schedule = Schedule(
            type="fixed_time",
            time_slots=[
                TimeSlot(time=self.base_time + timedelta(hours=6))
            ]
        )
        
        suggestions = self.adjuster.suggest_adjustments(
            non_conflicting_schedule,
            self.existing_schedules
        )
        
        self.assertEqual(len(suggestions), 0)

    def test_minimum_interval_between_suggestions(self):
        """Test that suggested times maintain minimum interval between medications."""
        conflicting_schedule = Schedule(
            type="fixed_time",
            time_slots=[TimeSlot(time=self.base_time)]
        )
        
        suggestions = self.adjuster.suggest_adjustments(
            conflicting_schedule,
            self.existing_schedules
        )
        
        for suggestion in suggestions:
            if suggestion["type"] == "time_shift":
                time_diff = abs(
                    (suggestion["suggested_time"] - self.base_time).total_seconds()
                ) / 60
                self.assertGreaterEqual(
                    time_diff,
                    ScheduleAdjustment.MIN_GAP_MINUTES
                )

if __name__ == '__main__':
    unittest.main()
