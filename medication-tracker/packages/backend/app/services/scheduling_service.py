from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum
import pytz
from app.models.schedule import Schedule, ScheduleType
from app.models.medication import Medication
from app.services.schedule_conflict import ScheduleConflictChecker
from app.services.notification_service import NotificationService

class ScheduleType(Enum):
    FIXED_TIME = "fixed_time"      # Set times each day
    INTERVAL = "interval"          # Every X hours
    PRN = "prn"                    # As needed
    COMPLEX = "complex"            # Different times/doses on different days
    CYCLIC = "cyclic"             # X days on, Y days off
    TAPERED = "tapered"           # Gradually changing doses
    MEAL_BASED = "meal_based"     # Related to meals
    SLIDING_SCALE = "sliding_scale"  # Based on measurements (e.g., insulin)

class MealTime(Enum):
    BEFORE_BREAKFAST = "before_breakfast"
    WITH_BREAKFAST = "with_breakfast"
    AFTER_BREAKFAST = "after_breakfast"
    BEFORE_LUNCH = "before_lunch"
    WITH_LUNCH = "with_lunch"
    AFTER_LUNCH = "after_lunch"
    BEFORE_DINNER = "before_dinner"
    WITH_DINNER = "with_dinner"
    AFTER_DINNER = "after_dinner"
    BEDTIME = "bedtime"

class SchedulingService:
    def __init__(
        self,
        notification_service: NotificationService
    ):
        self.notification_service = notification_service
        self.conflict_checker = ScheduleConflictChecker()

    async def create_schedule(
        self,
        medication_id: int,
        schedule_data: dict,
        user_id: int
    ) -> Schedule:
        """Create a new medication schedule with conflict checking."""
        # Create schedule object
        new_schedule = Schedule(
            medication_id=medication_id,
            user_id=user_id,
            **schedule_data
        )

        # Get existing schedules for conflict check
        existing_schedules = await self.get_user_schedules(user_id)
        
        # Check for conflicts
        conflicts = self.conflict_checker.check_conflicts(
            new_schedule,
            existing_schedules,
            datetime.utcnow()
        )
        
        if conflicts:
            return {
                'success': False,
                'conflicts': [
                    {
                        'medication1': conflict.medication1,
                        'medication2': conflict.medication2,
                        'time': conflict.time.isoformat(),
                        'type': conflict.conflict_type
                    }
                    for conflict in conflicts
                ]
            }

        # Save schedule if no conflicts
        await new_schedule.save()
        
        # Create notifications
        await self._create_schedule_notifications(new_schedule)
        
        return {
            'success': True,
            'schedule': new_schedule
        }

    async def update_schedule(
        self,
        schedule_id: int,
        schedule_data: dict,
        user_id: int
    ) -> Schedule:
        """Update an existing schedule with conflict checking."""
        existing_schedule = await Schedule.get(schedule_id)
        if not existing_schedule or existing_schedule.user_id != user_id:
            raise ValueError("Schedule not found or unauthorized")

        # Create updated schedule object
        updated_schedule = Schedule(
            id=schedule_id,
            medication_id=existing_schedule.medication_id,
            user_id=user_id,
            **schedule_data
        )

        # Get other schedules for conflict check
        other_schedules = [
            s for s in await self.get_user_schedules(user_id)
            if s.id != schedule_id
        ]
        
        # Check for conflicts
        conflicts = self.conflict_checker.check_conflicts(
            updated_schedule,
            other_schedules,
            datetime.utcnow()
        )
        
        if conflicts:
            return {
                'success': False,
                'conflicts': [
                    {
                        'medication1': conflict.medication1,
                        'medication2': conflict.medication2,
                        'time': conflict.time.isoformat(),
                        'type': conflict.conflict_type
                    }
                    for conflict in conflicts
                ]
            }

        # Save updated schedule if no conflicts
        await updated_schedule.save()
        
        # Update notifications
        await self._update_schedule_notifications(updated_schedule)
        
        return {
            'success': True,
            'schedule': updated_schedule
        }

    async def get_user_schedules(self, user_id: int) -> List[Schedule]:
        """Get all schedules for a user."""
        return await Schedule.filter(user_id=user_id).all()

    async def get_schedule(self, schedule_id: int, user_id: int) -> Optional[Schedule]:
        """Get a specific schedule."""
        schedule = await Schedule.get(schedule_id)
        if schedule and schedule.user_id == user_id:
            return schedule
        return None

    async def delete_schedule(self, schedule_id: int, user_id: int) -> bool:
        """Delete a schedule."""
        schedule = await self.get_schedule(schedule_id, user_id)
        if schedule:
            await schedule.delete()
            await self._delete_schedule_notifications(schedule)
            return True
        return False

    async def _create_schedule_notifications(self, schedule: Schedule):
        """Create notifications for a schedule."""
        # Implementation depends on notification service
        await self.notification_service.create_schedule_notifications(schedule)

    async def _update_schedule_notifications(self, schedule: Schedule):
        """Update notifications for a schedule."""
        # Delete old notifications
        await self._delete_schedule_notifications(schedule)
        # Create new notifications
        await self._create_schedule_notifications(schedule)

    async def _delete_schedule_notifications(self, schedule: Schedule):
        """Delete notifications for a schedule."""
        await self.notification_service.delete_schedule_notifications(schedule)
