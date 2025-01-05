from datetime import datetime, timedelta
from typing import List, Dict, Optional
from ..models.medication import Medication
from ..models.schedule import Schedule
from ..exceptions import (
    InvalidScheduleError,
    ConflictError,
    MedicationNotFoundError,
    ValidationError
)

class ScheduleAdjustment:
    MAX_MEDICATIONS = 1000
    MIN_INTERVAL = 4  # hours
    MAX_INTERVAL = 24  # hours
    MIN_PRIORITY = 1
    MAX_PRIORITY = 5
    
    def __init__(self):
        self.meal_times = {
            'breakfast': '08:00',
            'lunch': '12:00',
            'dinner': '18:00'
        }
        self.meal_flexibility = 60  # minutes

    def validate_schedule(self, schedule: Dict) -> None:
        """Validate schedule parameters."""
        required_fields = ['medication_id', 'start_time', 'interval_hours', 'priority']
        missing_fields = [field for field in required_fields if field not in schedule]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")

        try:
            datetime.fromisoformat(schedule['start_time'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise ValidationError("Invalid start_time format. Expected ISO 8601")

        if not isinstance(schedule['interval_hours'], (int, float)):
            raise ValidationError("interval_hours must be a number")

        if not self.MIN_INTERVAL <= schedule['interval_hours'] <= self.MAX_INTERVAL:
            raise ValidationError(f"interval_hours must be between {self.MIN_INTERVAL} and {self.MAX_INTERVAL}")

        if not isinstance(schedule['priority'], int):
            raise ValidationError("priority must be an integer")

        if not self.MIN_PRIORITY <= schedule['priority'] <= self.MAX_PRIORITY:
            raise ValidationError(f"priority must be between {self.MIN_PRIORITY} and {self.MAX_PRIORITY}")

    def check_conflicts(self, schedules: List[Dict]) -> List[Dict]:
        """Check for conflicts in medication schedules."""
        if len(schedules) > self.MAX_MEDICATIONS:
            raise ValidationError(f"Cannot process more than {self.MAX_MEDICATIONS} medications")

        try:
            for schedule in schedules:
                self.validate_schedule(schedule)
        except ValidationError as e:
            raise ValidationError(f"Invalid schedule: {str(e)}")

        conflicts = []
        for i, schedule1 in enumerate(schedules):
            for schedule2 in schedules[i + 1:]:
                conflict = self._check_pair_conflict(schedule1, schedule2)
                if conflict:
                    conflicts.append(conflict)

        return conflicts

    def _check_pair_conflict(self, schedule1: Dict, schedule2: Dict) -> Optional[Dict]:
        """Check for conflicts between two schedules."""
        try:
            time1 = datetime.fromisoformat(schedule1['start_time'].replace('Z', '+00:00'))
            time2 = datetime.fromisoformat(schedule2['start_time'].replace('Z', '+00:00'))
        except (ValueError, KeyError) as e:
            raise ValidationError(f"Invalid schedule time format: {str(e)}")

        # Check time proximity
        time_diff = abs((time1 - time2).total_seconds() / 3600)
        if time_diff < 2:  # 2 hours minimum gap
            return {
                'medication1': schedule1['medication_id'],
                'medication2': schedule2['medication_id'],
                'time': min(time1, time2).isoformat(),
                'type': 'time_proximity',
                'suggestions': self._generate_time_suggestions(schedule1, schedule2)
            }

        # Check interval overlap
        interval1 = schedule1['interval_hours']
        interval2 = schedule2['interval_hours']
        if self._check_interval_overlap(time1, interval1, time2, interval2):
            return {
                'medication1': schedule1['medication_id'],
                'medication2': schedule2['medication_id'],
                'time': time1.isoformat(),
                'type': 'interval_overlap',
                'suggestions': self._generate_interval_suggestions(schedule1, schedule2)
            }

        return None

    def _check_interval_overlap(self, time1: datetime, interval1: int, 
                              time2: datetime, interval2: int) -> bool:
        """Check if two intervals overlap within 24 hours."""
        times1 = set()
        times2 = set()
        
        current = time1
        end = time1 + timedelta(hours=24)
        while current < end:
            times1.add(current.hour)
            current += timedelta(hours=interval1)

        current = time2
        end = time2 + timedelta(hours=24)
        while current < end:
            times2.add(current.hour)
            current += timedelta(hours=interval2)

        return bool(times1.intersection(times2))

    def _generate_time_suggestions(self, schedule1: Dict, schedule2: Dict) -> List[Dict]:
        """Generate suggestions for time-based conflicts."""
        suggestions = []
        time1 = datetime.fromisoformat(schedule1['start_time'].replace('Z', '+00:00'))
        time2 = datetime.fromisoformat(schedule2['start_time'].replace('Z', '+00:00'))

        # Determine which schedule to adjust based on priority
        adjust_schedule = schedule1 if schedule1['priority'] <= schedule2['priority'] else schedule2
        other_schedule = schedule2 if adjust_schedule == schedule1 else schedule1

        # Try different time shifts
        for hours in [2, 3, 4]:
            for direction in [-1, 1]:
                new_time = time1 + timedelta(hours=hours * direction)
                if not self._check_interval_overlap(new_time, adjust_schedule['interval_hours'],
                                                 time2, other_schedule['interval_hours']):
                    suggestions.append({
                        'type': 'time_shift',
                        'description': f"Move {adjust_schedule['medication_id']} to {new_time.strftime('%I:%M %p')}",
                        'reason': f"Creates {hours}-hour gap between medications",
                        'original_time': time1.isoformat(),
                        'suggested_time': new_time.isoformat()
                    })

        return suggestions

    def _generate_interval_suggestions(self, schedule1: Dict, schedule2: Dict) -> List[Dict]:
        """Generate suggestions for interval-based conflicts."""
        suggestions = []
        
        # Try adjusting intervals
        for schedule in [schedule1, schedule2]:
            current_interval = schedule['interval_hours']
            for new_interval in [6, 8, 12]:
                if (new_interval != current_interval and 
                    self.MIN_INTERVAL <= new_interval <= self.MAX_INTERVAL):
                    suggestions.append({
                        'type': 'interval_adjustment',
                        'description': f"Change {schedule['medication_id']} interval to {new_interval} hours",
                        'reason': "Maintains therapeutic levels while avoiding conflicts",
                        'original_interval': current_interval,
                        'suggested_interval': new_interval
                    })

        return suggestions

    def apply_adjustment(self, medication_id: str, adjustment: Dict) -> Dict:
        """Apply a schedule adjustment."""
        if 'type' not in adjustment:
            raise ValidationError("Adjustment must specify type")

        if adjustment['type'] == 'time_shift':
            if 'new_time' not in adjustment:
                raise ValidationError("Time shift adjustment must specify new_time")
            try:
                new_time = datetime.fromisoformat(adjustment['new_time'].replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError("Invalid new_time format")

        elif adjustment['type'] == 'interval_adjustment':
            if 'new_interval' not in adjustment:
                raise ValidationError("Interval adjustment must specify new_interval")
            if not self.MIN_INTERVAL <= adjustment['new_interval'] <= self.MAX_INTERVAL:
                raise ValidationError(f"New interval must be between {self.MIN_INTERVAL} and {self.MAX_INTERVAL}")

        # Return adjusted schedule
        return {
            'medication_id': medication_id,
            **{k: v for k, v in adjustment.items() if k != 'type'}
        }
