from datetime import datetime, timedelta
from typing import List, Optional, Dict
from app.domain.notification.services import NotificationDomainService
from app.domain.notification.entities import (
    Notification,
    NotificationSchedule,
    NotificationType
)
from app.domain.user.repositories import UserRepository, CarerRepository
from app.application.dtos.notification import (
    CreateNotificationDTO,
    NotificationResponseDTO,
    CreateScheduleDTO,
    ScheduleResponseDTO,
    UpdatePreferencesDTO,
    NotificationSummaryDTO,
    NotificationChannelDTO
)
from app.application.exceptions import (
    NotFoundException,
    ValidationError,
    UnauthorizedError,
    ExternalServiceError
)
from app.infrastructure.notification.email_sender import EmailSender
from app.infrastructure.notification.push_sender import PushSender
from app.infrastructure.websocket.manager import manager
from app.infrastructure.queue.redis_manager import queue_manager

class NotificationApplicationService:
    MAX_RETRY_ATTEMPTS = 3
    RETRY_DELAY_SECONDS = 300  # 5 minutes

    def __init__(
        self,
        notification_service: NotificationDomainService,
        user_repository: UserRepository,
        carer_repository: CarerRepository,
        email_sender: EmailSender,
        push_sender: PushSender
    ):
        self._notification_service = notification_service
        self._user_repository = user_repository
        self._carer_repository = carer_repository
        self._email_sender = email_sender
        self._push_sender = push_sender

    async def create_notification(
        self,
        dto: CreateNotificationDTO,
        created_by_id: int
    ) -> NotificationResponseDTO:
        """Create and send a new notification"""
        try:
            # Validate user exists
            user = self._user_repository.get_by_id(dto.user_id)
            if not user:
                raise NotFoundException("User not found")

            # Check authorization
            if created_by_id != dto.user_id:
                carer = self._carer_repository.get_by_user_id(created_by_id)
                if not carer or dto.user_id not in carer.patients:
                    raise UnauthorizedError(
                        "Not authorized to send notifications to this user"
                    )

            # Apply notification template if specified
            if dto.template_id:
                try:
                    template = self._notification_service.get_template(dto.template_id)
                    dto.title = template.format_title(dto.data)
                    dto.message = template.format_message(dto.data)
                except Exception as e:
                    raise ValidationError(f"Failed to apply template: {str(e)}")

            # Create notification
            notification = self._notification_service.create_notification(
                notification_type=dto.type,
                user_id=dto.user_id,
                title=dto.title,
                message=dto.message,
                data=dto.data,
                urgency=dto.urgency,
                action_required=dto.action_required,
                action_type=dto.action_type,
                action_data=dto.action_data,
                carer_id=dto.carer_id,
                schedule_time=dto.schedule_time,
                retry_count=dto.retry_count,
                max_retries=dto.max_retries,
                metadata=dto.metadata
            )

            # Send through configured channels
            await self._send_notification(notification, user)

            return self._to_notification_response(notification)

        except Exception as e:
            raise

    async def create_batch_notifications(
        self,
        dtos: List[CreateNotificationDTO],
        created_by_id: int
    ) -> List[NotificationResponseDTO]:
        """Create and send multiple notifications in batch"""
        responses = []
        errors = []

        for dto in dtos:
            try:
                response = await self.create_notification(dto, created_by_id)
                responses.append(response)
            except Exception as e:
                errors.append({
                    "user_id": dto.user_id,
                    "error": str(e)
                })

        if errors:
            # Log errors but continue processing
            print(f"Batch notification errors: {errors}")

        return responses

    async def retry_failed_notifications(self) -> int:
        """Retry sending failed notifications"""
        failed_notifications = self._notification_service.get_failed_notifications()
        retry_count = 0

        for notification in failed_notifications:
            if notification.retry_count >= self.MAX_RETRY_ATTEMPTS:
                continue

            try:
                user = self._user_repository.get_by_id(notification.user_id)
                if not user:
                    continue

                await self._send_notification(notification, user)
                retry_count += 1

            except Exception as e:
                notification.retry_count += 1
                notification.record_error(f"Retry failed: {str(e)}")
                self._notification_service._notification_repository.update(notification)

        return retry_count

    async def schedule_notification(
        self,
        notification: Notification,
        schedule_time: Optional[datetime] = None
    ) -> None:
        """Schedule a notification for delivery"""
        try:
            # Store notification in database first
            await self._notification_service._notification_repository.create(notification)
            
            # Add to queue for processing
            await queue_manager.enqueue_notification(
                notification.to_dict(),
                schedule_time=schedule_time
            )
            
            print(f"Notification {notification.id} scheduled successfully")
            
        except Exception as e:
            print(f"Failed to schedule notification: {str(e)}")
            raise ExternalServiceError(f"Failed to schedule notification: {str(e)}")

    def get_user_notifications(
        self,
        user_id: int,
        requesting_user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationResponseDTO]:
        """Get notifications for a user"""
        # Check authorization
        if requesting_user_id != user_id:
            carer = self._carer_repository.get_by_user_id(requesting_user_id)
            if not carer or user_id not in carer.patients:
                raise UnauthorizedError(
                    "Not authorized to view notifications for this user"
                )

        notifications = self._notification_service.get_user_notifications(
            user_id,
            unread_only,
            limit
        )

        return [
            self._to_notification_response(notification)
            for notification in notifications
        ]

    def get_notification_summary(
        self,
        user_id: int,
        requesting_user_id: int
    ) -> NotificationSummaryDTO:
        """Get a summary of notifications for a user"""
        # Check authorization
        if requesting_user_id != user_id:
            carer = self._carer_repository.get_by_user_id(requesting_user_id)
            if not carer or user_id not in carer.patients:
                raise UnauthorizedError(
                    "Not authorized to view notifications for this user"
                )

        notifications = self._notification_service.get_user_notifications(
            user_id,
            unread_only=False,
            limit=10
        )

        return NotificationSummaryDTO(
            unread_count=sum(1 for n in notifications if not n.read),
            urgent_count=sum(1 for n in notifications if n.urgency == "urgent"),
            action_required_count=sum(1 for n in notifications if n.action_required),
            latest_notifications=[
                self._to_notification_response(n)
                for n in notifications[:5]
            ]
        )

    def mark_notifications_read(
        self,
        notification_ids: List[int],
        user_id: int
    ) -> bool:
        """Mark notifications as read"""
        # Verify all notifications belong to user
        for notification_id in notification_ids:
            notification = self._notification_service._notification_repository.get_by_id(
                notification_id
            )
            if not notification:
                continue
            if notification.user_id != user_id:
                raise UnauthorizedError(
                    "Not authorized to mark this notification as read"
                )

        return self._notification_service.mark_notifications_as_read(notification_ids)

    def update_notification_preferences(
        self,
        dto: UpdatePreferencesDTO,
        updating_user_id: int
    ) -> None:
        """Update notification preferences for a user"""
        # Check authorization
        if updating_user_id != dto.user_id:
            carer = self._carer_repository.get_by_user_id(updating_user_id)
            if not carer or dto.user_id not in carer.patients:
                raise UnauthorizedError(
                    "Not authorized to update preferences for this user"
                )

        user = self._user_repository.get_by_id(dto.user_id)
        if not user:
            raise NotFoundException("User not found")

        user.notification_preferences = dto.preferences.__dict__
        self._user_repository.update(user)

    def get_notification_channels(
        self,
        user_id: int
    ) -> List[NotificationChannelDTO]:
        """Get configured notification channels for a user"""
        user = self._user_repository.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        channels = []
        
        # Email channel
        channels.append(NotificationChannelDTO(
            channel_type="email",
            enabled=user.notification_preferences.get('email_enabled', False),
            configuration={"email": user.email},
            verified=user.email_verified,
            last_verified=None  # TODO: Track verification time
        ))

        # Push channel
        channels.append(NotificationChannelDTO(
            channel_type="push",
            enabled=user.notification_preferences.get('push_enabled', False),
            configuration={"subscription": user.push_subscription},
            verified=bool(user.push_subscription),
            last_verified=None
        ))

        return channels

    async def process_due_notifications(self):
        """Process notifications that are due"""
        self._notification_service.process_due_notifications()

    async def _send_notification(
        self,
        notification: Notification,
        user: 'User'
    ) -> None:
        """Send a notification through configured channels with retry logic"""
        try:
            preferences = user.notification_preferences

            # Prioritize urgent notifications
            if notification.urgency == "urgent":
                # Send through all available channels
                channels_to_try = ["push", "email"]
            else:
                # Use preferred channels based on notification type
                channels_to_try = self._get_preferred_channels(
                    notification.type,
                    preferences
                )

            success = False
            for channel in channels_to_try:
                try:
                    if channel == "email" and preferences.get('email_enabled') and user.email_verified:
                        await self._email_sender.send_notification(
                            to_email=user.email,
                            subject=notification.title,
                            body=notification.message,
                            data=notification.data
                        )
                        success = True

                    elif channel == "push" and preferences.get('push_enabled') and user.push_subscription:
                        await self._push_sender.send_notification(
                            subscription=user.push_subscription,
                            title=notification.title,
                            body=notification.message,
                            data=notification.data
                        )
                        success = True

                except Exception as e:
                    print(f"Failed to send {channel} notification: {str(e)}")
                    continue

            # Also send through WebSocket if available
            await manager.send_notification(str(notification.user_id), notification)

            if success:
                notification.mark_as_sent()
            else:
                raise ExternalServiceError("All notification channels failed")

        except Exception as e:
            notification.record_error(str(e))
            notification.retry_count = getattr(notification, 'retry_count', 0) + 1
            
            if notification.retry_count < self.MAX_RETRY_ATTEMPTS:
                # Schedule retry
                self._notification_service.schedule_retry(
                    notification,
                    datetime.utcnow() + timedelta(seconds=self.RETRY_DELAY_SECONDS)
                )
            
            raise ExternalServiceError(f"Failed to send notification: {str(e)}")
        
        finally:
            self._notification_service._notification_repository.update(notification)

    def _get_preferred_channels(
        self,
        notification_type: str,
        preferences: dict
    ) -> List[str]:
        """Get preferred notification channels based on type and preferences"""
        if notification_type == "medication_reminder":
            return ["push", "email"]
        elif notification_type == "refill_alert":
            return ["email", "push"]
        elif notification_type == "compliance_report":
            return ["email"]
        else:
            return ["push"] if preferences.get('push_enabled') else ["email"]

    def _to_notification_response(
        self,
        notification: Notification
    ) -> NotificationResponseDTO:
        """Convert notification entity to response DTO"""
        return NotificationResponseDTO(
            id=notification.id,
            type=notification.type,
            user_id=notification.user_id,
            title=notification.title,
            message=notification.message,
            data=notification.data,
            read=notification.read,
            sent=notification.sent,
            error=notification.error,
            sent_at=notification.sent_at,
            read_at=notification.read_at,
            urgency=notification.urgency,
            action_required=notification.action_required,
            action_type=notification.action_type,
            action_data=notification.action_data,
            carer_id=notification.carer_id,
            created_at=notification.created_at,
            updated_at=notification.updated_at,
            schedule_time=notification.schedule_time,
            retry_count=notification.retry_count,
            max_retries=notification.max_retries,
            metadata=notification.metadata,
            success=True
        )

    def _to_schedule_response(
        self,
        schedule: NotificationSchedule
    ) -> ScheduleResponseDTO:
        """Convert schedule entity to response DTO"""
        return ScheduleResponseDTO(
            id=schedule.id,
            notification_type=schedule.notification_type,
            user_id=schedule.user_id,
            scheduled_time=schedule.scheduled_time,
            data=schedule.data,
            processed=schedule.processed,
            processed_at=schedule.processed_at,
            recurring=schedule.recurring,
            recurrence_pattern=schedule.recurrence_pattern,
            next_schedule=schedule.next_schedule,
            carer_id=schedule.carer_id,
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
            success=True
        )
