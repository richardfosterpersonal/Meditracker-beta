from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from .entities import (
    Notification,
    NotificationSchedule,
    NotificationType,
    NotificationTemplate
)
from .repositories import NotificationRepository, NotificationScheduleRepository
from ..user.repositories import UserRepository, CarerRepository

class NotificationDomainService:
    def __init__(
        self,
        notification_repository: NotificationRepository,
        schedule_repository: NotificationScheduleRepository,
        user_repository: UserRepository,
        carer_repository: CarerRepository
    ):
        self._notification_repository = notification_repository
        self._schedule_repository = schedule_repository
        self._user_repository = user_repository
        self._carer_repository = carer_repository
        self._templates = self._initialize_templates()

    def _initialize_templates(self) -> Dict[str, NotificationTemplate]:
        return {
            NotificationType.MEDICATION_DUE: NotificationTemplate(
                type=NotificationType.MEDICATION_DUE,
                title="Medication Due",
                message="Time to take {medication_name}",
                action_required=True,
                action_type="take_medication"
            ),
            NotificationType.MEDICATION_MISSED: NotificationTemplate(
                type=NotificationType.MEDICATION_MISSED,
                title="Missed Medication",
                message="You missed your scheduled dose of {medication_name}",
                urgency="urgent",
                action_required=True,
                action_type="record_missed"
            ),
            NotificationType.MEDICATION_TAKEN: NotificationTemplate(
                type=NotificationType.MEDICATION_TAKEN,
                title="Medication Taken",
                message="{patient_name} has taken their medication: {medication_name}"
            ),
            NotificationType.REFILL_NEEDED: NotificationTemplate(
                type=NotificationType.REFILL_NEEDED,
                title="Refill Needed",
                message="Time to refill {medication_name}. {doses_remaining} doses remaining",
                action_required=True,
                action_type="mark_refilled"
            ),
            NotificationType.COMPLIANCE_ALERT: NotificationTemplate(
                type=NotificationType.COMPLIANCE_ALERT,
                title="Compliance Alert",
                message="Compliance issue detected for {medication_name}",
                urgency="urgent",
                action_required=True,
                action_type="review_compliance"
            ),
            NotificationType.CARER_ASSIGNMENT: NotificationTemplate(
                type=NotificationType.CARER_ASSIGNMENT,
                title="Carer Assignment",
                message="You have been assigned as a carer for {patient_name}",
                action_required=True,
                action_type="accept_assignment"
            ),
            NotificationType.EMERGENCY_ALERT: NotificationTemplate(
                type=NotificationType.EMERGENCY_ALERT,
                title="Emergency Alert",
                message="Emergency alert for {patient_name}: {alert_message}",
                urgency="emergency",
                action_required=True,
                action_type="acknowledge_emergency"
            )
        }

    def create_notification(
        self,
        notification_type: str,
        user_id: int,
        data: Dict[str, Any],
        carer_id: Optional[int] = None
    ) -> Notification:
        """Create a new notification"""
        template = self._templates.get(notification_type)
        if not template:
            raise ValueError(f"Unknown notification type: {notification_type}")

        notification = Notification(
            type=notification_type,
            user_id=user_id,
            title=template.title.format(**data),
            message=template.message.format(**data),
            data=data,
            urgency=template.urgency,
            action_required=template.action_required,
            action_type=template.action_type,
            action_data=template.action_data,
            carer_id=carer_id
        )

        return self._notification_repository.save(notification)

    def schedule_notification(
        self,
        notification_type: str,
        user_id: int,
        scheduled_time: datetime,
        data: Dict[str, Any],
        recurring: bool = False,
        recurrence_pattern: Optional[str] = None,
        carer_id: Optional[int] = None
    ) -> NotificationSchedule:
        """Schedule a notification for future delivery"""
        schedule = NotificationSchedule(
            notification_type=notification_type,
            user_id=user_id,
            scheduled_time=scheduled_time,
            data=data,
            recurring=recurring,
            recurrence_pattern=recurrence_pattern,
            carer_id=carer_id
        )

        return self._schedule_repository.save(schedule)

    def process_due_notifications(self):
        """Process notifications that are due"""
        now = datetime.utcnow()
        due_schedules = self._schedule_repository.get_due_schedules(
            start_time=now - timedelta(minutes=5),
            end_time=now
        )

        for schedule in due_schedules:
            try:
                self.create_notification(
                    notification_type=schedule.notification_type,
                    user_id=schedule.user_id,
                    data=schedule.data,
                    carer_id=schedule.carer_id
                )
                schedule.mark_as_processed()
                self._schedule_repository.update(schedule)
            except Exception as e:
                # Log error and continue processing other schedules
                print(f"Error processing schedule {schedule.id}: {str(e)}")

    def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        return self._notification_repository.get_for_user(
            user_id,
            unread_only,
            limit
        )

    def get_carer_notifications(
        self,
        carer_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a carer"""
        return self._notification_repository.get_for_carer(
            carer_id,
            unread_only,
            limit
        )

    def mark_notifications_as_read(self, notification_ids: List[int]) -> bool:
        """Mark notifications as read"""
        return self._notification_repository.mark_as_read(notification_ids)
