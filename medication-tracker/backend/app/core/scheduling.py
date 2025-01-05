from datetime import datetime, time, timedelta
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class TimeSlot:
    """Represents a time slot for medication scheduling."""
    start_time: time
    end_time: time
    priority: int = 0

class ScheduleOptimizer:
    """Optimizes medication schedules to avoid conflicts and improve adherence."""
    
    def __init__(self, time_slots: List[TimeSlot]):
        self.time_slots = sorted(time_slots, key=lambda x: x.start_time)
    
    def optimize_schedule(self, medications: List[dict]) -> List[dict]:
        """Optimize the schedule for a list of medications."""
        optimized = []
        for med in medications:
            optimized_times = self._find_optimal_times(med)
            med_copy = med.copy()
            med_copy["times"] = optimized_times
            optimized.append(med_copy)
        return optimized
    
    def _find_optimal_times(self, medication: dict) -> List[time]:
        """Find optimal times for a medication based on its frequency."""
        frequency = medication.get("frequency", "daily")
        times_per_day = medication.get("times_per_day", 1)
        
        if frequency == "daily":
            return self._optimize_daily_schedule(times_per_day)
        elif frequency == "weekly":
            return self._optimize_weekly_schedule(medication)
        else:
            return self._optimize_monthly_schedule(medication)
    
    def _optimize_daily_schedule(self, times_per_day: int) -> List[time]:
        """Optimize schedule for daily medications."""
        optimal_slots = []
        slot_duration = 24 // times_per_day
        
        for i in range(times_per_day):
            target_hour = (i * slot_duration + 8) % 24  # Start from 8 AM
            optimal_slots.append(time(hour=target_hour))
        
        return optimal_slots
    
    def _optimize_weekly_schedule(self, medication: dict) -> List[time]:
        """Optimize schedule for weekly medications."""
        days = medication.get("days", [0])  # Default to Monday
        times = []
        
        for day in days:
            daily_times = self._optimize_daily_schedule(1)
            times.extend(daily_times)
        
        return times
    
    def _optimize_monthly_schedule(self, medication: dict) -> List[time]:
        """Optimize schedule for monthly medications."""
        days = medication.get("days", [1])  # Default to 1st of month
        times = []
        
        for day in days:
            daily_times = self._optimize_daily_schedule(1)
            times.extend(daily_times)
        
        return times
