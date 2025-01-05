import unittest
from datetime import datetime, timedelta
from app.services.schedule_conflict import ScheduleConflictChecker
from app.models.schedule import Schedule, ScheduleType
from app.models.medication import Medication

class TestScheduleConflictChecker(unittest.TestCase):
    def setUp(self):
        self.checker = ScheduleConflictChecker()
        self.test_date = datetime(2024, 1, 1, 12, 0)  # Noon on Jan 1, 2024

    def test_fixed_time_conflict(self):
        # Create two medications with overlapping fixed times
        med1 = Medication(name="Med1")
        med2 = Medication(name="Med2")

        schedule1 = Schedule(
            medication=med1,
            type=ScheduleType.FIXED_TIME,
            fixed_time_slots=[{"time": "12:00", "dose": 1}]
        )

        schedule2 = Schedule(
            medication=med2,
            type=ScheduleType.FIXED_TIME,
            fixed_time_slots=[{"time": "12:15", "dose": 1}]  # Within 30 min
        )

        conflicts = self.checker.check_conflicts(
            schedule1,
            [schedule2],
            self.test_date
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].medication1, "Med1")
        self.assertEqual(conflicts[0].medication2, "Med2")
        self.assertEqual(conflicts[0].conflict_type, "time_proximity")

    def test_interval_conflict(self):
        # Create two medications with interval schedules
        med1 = Medication(name="Med1")
        med2 = Medication(name="Med2")

        schedule1 = Schedule(
            medication=med1,
            type=ScheduleType.INTERVAL,
            interval={"hours": 4, "dose": 1}
        )

        schedule2 = Schedule(
            medication=med2,
            type=ScheduleType.INTERVAL,
            interval={"hours": 6, "dose": 1}
        )

        conflicts = self.checker.check_conflicts(
            schedule1,
            [schedule2],
            self.test_date
        )

        # Should conflict at some point during the day
        self.assertTrue(len(conflicts) > 0)

    def test_meal_based_conflict(self):
        # Create two medications around meal times
        med1 = Medication(name="Med1")
        med2 = Medication(name="Med2")

        schedule1 = Schedule(
            medication=med1,
            type=ScheduleType.MEAL_BASED,
            meal_based={
                "meal": "breakfast",
                "relation": "before",
                "time_offset": 15,
                "dose": 1
            }
        )

        schedule2 = Schedule(
            medication=med2,
            type=ScheduleType.MEAL_BASED,
            meal_based={
                "meal": "breakfast",
                "relation": "before",
                "time_offset": 30,
                "dose": 1
            }
        )

        conflicts = self.checker.check_conflicts(
            schedule1,
            [schedule2],
            self.test_date
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].conflict_type, "time_proximity")

    def test_cyclic_schedule(self):
        # Test cyclic schedule conflicts
        med1 = Medication(name="Med1")
        med2 = Medication(name="Med2")

        schedule1 = Schedule(
            medication=med1,
            type=ScheduleType.CYCLIC,
            cyclic={
                "days_on": 5,
                "days_off": 2,
                "dose": 1
            },
            fixed_time_slots=[{"time": "12:00", "dose": 1}],
            start_date=self.test_date.date()
        )

        schedule2 = Schedule(
            medication=med2,
            type=ScheduleType.FIXED_TIME,
            fixed_time_slots=[{"time": "12:15", "dose": 1}]
        )

        conflicts = self.checker.check_conflicts(
            schedule1,
            [schedule2],
            self.test_date
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].conflict_type, "time_proximity")

    def test_no_conflict(self):
        # Test schedules that don't conflict
        med1 = Medication(name="Med1")
        med2 = Medication(name="Med2")

        schedule1 = Schedule(
            medication=med1,
            type=ScheduleType.FIXED_TIME,
            fixed_time_slots=[{"time": "08:00", "dose": 1}]
        )

        schedule2 = Schedule(
            medication=med2,
            type=ScheduleType.FIXED_TIME,
            fixed_time_slots=[{"time": "20:00", "dose": 1}]
        )

        conflicts = self.checker.check_conflicts(
            schedule1,
            [schedule2],
            self.test_date
        )

        self.assertEqual(len(conflicts), 0)

if __name__ == '__main__':
    unittest.main()
