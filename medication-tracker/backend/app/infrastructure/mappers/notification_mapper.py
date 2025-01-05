from app.domain.notification.entities import (
    Notification as NotificationEntity,
    NotificationSchedule as ScheduleEntity
)
from app.infrastructure.database.models import (
    Notification as NotificationModel,
    NotificationSchedule as ScheduleModel
)
from .base_mapper import BaseMapper

class NotificationMapper(BaseMapper[NotificationEntity, NotificationModel]):
    def to_entity(self, model: NotificationModel) -> NotificationEntity:
        if not model:
            return None
            
        return NotificationEntity(
            type=model.type,
            user_id=model.user_id,
            title=model.title,
            message=model.message,
            data=model.data or {},
            read=model.read,
            sent=model.sent,
            error=model.error,
            sent_at=model.sent_at,
            read_at=model.read_at,
            urgency=model.urgency,
            action_required=model.action_required,
            action_type=model.action_type,
            action_data=model.action_data,
            carer_id=model.carer_id,
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

    def to_model(self, entity: NotificationEntity) -> NotificationModel:
        if not entity:
            return None
            
        return NotificationModel(
            id=entity.id,
            type=entity.type,
            user_id=entity.user_id,
            title=entity.title,
            message=entity.message,
            data=entity.data,
            read=entity.read,
            sent=entity.sent,
            error=entity.error,
            sent_at=entity.sent_at,
            read_at=entity.read_at,
            urgency=entity.urgency,
            action_required=entity.action_required,
            action_type=entity.action_type,
            action_data=entity.action_data,
            carer_id=entity.carer_id,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

class NotificationScheduleMapper(BaseMapper[ScheduleEntity, ScheduleModel]):
    def to_entity(self, model: ScheduleModel) -> ScheduleEntity:
        if not model:
            return None
            
        return ScheduleEntity(
            notification_type=model.notification_type,
            user_id=model.user_id,
            scheduled_time=model.scheduled_time,
            data=model.data or {},
            processed=model.processed,
            processed_at=model.processed_at,
            recurring=model.recurring,
            recurrence_pattern=model.recurrence_pattern,
            next_schedule=model.next_schedule,
            carer_id=model.carer_id,
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

    def to_model(self, entity: ScheduleEntity) -> ScheduleModel:
        if not entity:
            return None
            
        return ScheduleModel(
            id=entity.id,
            notification_type=entity.notification_type,
            user_id=entity.user_id,
            scheduled_time=entity.scheduled_time,
            data=entity.data,
            processed=entity.processed,
            processed_at=entity.processed_at,
            recurring=entity.recurring,
            recurrence_pattern=entity.recurrence_pattern,
            next_schedule=entity.next_schedule,
            carer_id=entity.carer_id,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
