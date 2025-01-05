from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app.models.medication import Medication
from app.models.schedule import Schedule, ScheduleType

class ScheduleConflict:
    def __init__(
        self,
        medication1: str,
        medication2: str,
        time: datetime,
        conflict_type: str
    ):
        self.medication1 = medication1
        self.medication2 = medication2
        self.time = time
        self.conflict_type = conflict_type

class ScheduleConflictChecker:
    def __init__(self):
        self.MIN_DOSE_INTERVAL = timedelta(minutes=30)  # Minimum time between doses
    
    def check_conflicts(
        self,
        new_schedule: Schedule,
        existing_schedules: List[Schedule],
        date: datetime
    ) -> List[ScheduleConflict]:
        """Check for conflicts between a new schedule and existing schedules."""
        conflicts = []
        
        # Get dose times for new schedule
        new_dose_times = self._get_dose_times(new_schedule, date)
        
        # Check against each existing schedule
        for existing_schedule in existing_schedules:
            existing_dose_times = self._get_dose_times(existing_schedule, date)
            
            # Check for time conflicts
            time_conflicts = self._check_time_conflicts(
                new_dose_times,
                existing_dose_times,
                new_schedule.medication.name,
                existing_schedule.medication.name
            )
            conflicts.extend(time_conflicts)
        
        return conflicts

    def _get_dose_times(
        self,
        schedule: Schedule,
        date: datetime
    ) -> List[datetime]:
        """Get all dose times for a schedule on a given date."""
        dose_times = []
        
        if schedule.type == ScheduleType.FIXED_TIME:
            dose_times = self._get_fixed_time_doses(schedule, date)
        elif schedule.type == ScheduleType.INTERVAL:
            dose_times = self._get_interval_doses(schedule, date)
        elif schedule.type == ScheduleType.MEAL_BASED:
            dose_times = self._get_meal_based_doses(schedule, date)
        elif schedule.type == ScheduleType.CYCLIC:
            if self._is_medication_day(schedule, date):
                dose_times = self._get_fixed_time_doses(schedule, date)
        elif schedule.type == ScheduleType.TAPERED:
            if self._get_taper_dose(schedule, date) > 0:
                dose_times = self._get_fixed_time_doses(schedule, date)
        
        return dose_times

    def _check_time_conflicts(
        self,
        times1: List[datetime],
        times2: List[datetime],
        med1: str,
        med2: str
    ) -> List[ScheduleConflict]:
        """Check for conflicts between two sets of dose times."""
        conflicts = []
        
        for time1 in times1:
            for time2 in times2:
                time_diff = abs(time1 - time2)
                if time_diff < self.MIN_DOSE_INTERVAL:
                    conflicts.append(
                        ScheduleConflict(
                            medication1=med1,
                            medication2=med2,
                            time=time1,
                            conflict_type="time_proximity"
                        )
                    )
        
        return conflicts

    def _get_fixed_time_doses(
        self,
        schedule: Schedule,
        date: datetime
    ) -> List[datetime]:
        """Get dose times for fixed time schedule."""
        times = []
        for time_slot in schedule.fixed_time_slots:
            hour, minute = map(int, time_slot.time.split(':'))
            dose_time = date.replace(hour=hour, minute=minute)
            times.append(dose_time)
        return times

    def _get_interval_doses(
        self,
        schedule: Schedule,
        date: datetime
    ) -> List[datetime]:
        """Get dose times for interval-based schedule."""
        times = []
        interval_hours = schedule.interval.hours
        current_time = date.replace(hour=0, minute=0)
        end_time = date.replace(hour=23, minute=59)
        
        while current_time <= end_time:
            times.append(current_time)
            current_time += timedelta(hours=interval_hours)
        
        return times

    def _get_meal_based_doses(
        self,
        schedule: Schedule,
        date: datetime
    ) -> List[datetime]:
        """Get dose times for meal-based schedule."""
        meal_times = {
            'breakfast': date.replace(hour=8, minute=0),
            'lunch': date.replace(hour=12, minute=0),
            'dinner': date.replace(hour=18, minute=0)
        }
        
        base_time = meal_times[schedule.meal_based.meal]
        offset = timedelta(minutes=schedule.meal_based.time_offset)
        
        if schedule.meal_based.relation == 'before':
            return [base_time - offset]
        elif schedule.meal_based.relation == 'after':
            return [base_time + offset]
        else:  # with
            return [base_time]

    def _is_medication_day(self, schedule: Schedule, date: datetime) -> bool:
        """Check if medication should be taken on this day for cyclic schedule."""
        if not schedule.cyclic:
            return True
            
        start_date = schedule.start_date
        days_since_start = (date - start_date).days
        cycle_length = schedule.cyclic.days_on + schedule.cyclic.days_off
        day_in_cycle = days_since_start % cycle_length
        
        return day_in_cycle < schedule.cyclic.days_on

    def _get_taper_dose(self, schedule: Schedule, date: datetime) -> float:
        """Get the dose for a specific date in a tapered schedule."""
        if not schedule.tapered:
            return 0
            
        days_since_start = (date - schedule.start_date).days
        if days_since_start >= schedule.tapered.days:
            return 0
            
        dose_change = (
            schedule.tapered.end_dose - schedule.tapered.start_dose
        ) / (schedule.tapered.steps - 1)
        
        step = days_since_start // (schedule.tapered.days // schedule.tapered.steps)
        return schedule.tapered.start_dose + (dose_change * step)
