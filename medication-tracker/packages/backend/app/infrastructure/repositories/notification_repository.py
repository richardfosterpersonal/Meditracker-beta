from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.domain.notification.repositories import NotificationRepository, NotificationScheduleRepository
from app.domain.notification.entities import Notification as NotificationEntity, NotificationSchedule as ScheduleEntity
from app.infrastructure.database.models import Notification as NotificationModel, NotificationSchedule as ScheduleModel
from app.infrastructure.mappers.notification_mapper import NotificationMapper, NotificationScheduleMapper

class SQLNotificationRepository(NotificationRepository):
    def __init__(self, db: Session):
        self.db = db
        self.mapper = NotificationMapper()

    def save(self, notification: NotificationEntity) -> NotificationEntity:
        notification_model = self.mapper.to_model(notification)
        if notification_model.id:
            self.db.merge(notification_model)
        else:
            self.db.add(notification_model)
        self.db.commit()
        self.db.refresh(notification_model)
        return self.mapper.to_entity(notification_model)

    def get_by_id(self, notification_id: int) -> Optional[NotificationEntity]:
        notification_model = self.db.query(NotificationModel).filter(
            NotificationModel.id == notification_id
        ).first()
        return self.mapper.to_entity(notification_model) if notification_model else None

    def get_for_user(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationEntity]:
        query = self.db.query(NotificationModel).filter(
            NotificationModel.user_id == user_id
        )
        
        if unread_only:
            query = query.filter(NotificationModel.read == False)
            
        notification_models = query.order_by(
            NotificationModel.created_at.desc()
        ).limit(limit).all()
        
        return [self.mapper.to_entity(model) for model in notification_models]

    def get_for_carer(
        self,
        carer_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationEntity]:
        query = self.db.query(NotificationModel).filter(
            NotificationModel.carer_id == carer_id
        )
        
        if unread_only:
            query = query.filter(NotificationModel.read == False)
            
        notification_models = query.order_by(
            NotificationModel.created_at.desc()
        ).limit(limit).all()
        
        return [self.mapper.to_entity(model) for model in notification_models]

    def mark_as_read(self, notification_ids: List[int]) -> bool:
        try:
            self.db.query(NotificationModel).filter(
                NotificationModel.id.in_(notification_ids)
            ).update({
                NotificationModel.read: True,
                NotificationModel.read_at: datetime.utcnow()
            }, synchronize_session=False)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False

    def delete(self, notification_id: int) -> bool:
        result = self.db.query(NotificationModel).filter(
            NotificationModel.id == notification_id
        ).delete()
        self.db.commit()
        return result > 0

class SQLNotificationScheduleRepository(NotificationScheduleRepository):
    def __init__(self, db: Session):
        self.db = db
        self.mapper = NotificationScheduleMapper()

    def save(self, schedule: ScheduleEntity) -> ScheduleEntity:
        schedule_model = self.mapper.to_model(schedule)
        if schedule_model.id:
            self.db.merge(schedule_model)
        else:
            self.db.add(schedule_model)
        self.db.commit()
        self.db.refresh(schedule_model)
        return self.mapper.to_entity(schedule_model)

    def get_by_id(self, schedule_id: int) -> Optional[ScheduleEntity]:
        schedule_model = self.db.query(ScheduleModel).filter(
            ScheduleModel.id == schedule_id
        ).first()
        return self.mapper.to_entity(schedule_model) if schedule_model else None

    def get_due_schedules(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[ScheduleEntity]:
        schedule_models = self.db.query(ScheduleModel).filter(
            ScheduleModel.scheduled_time.between(start_time, end_time),
            ScheduleModel.processed == False
        ).all()
        return [self.mapper.to_entity(model) for model in schedule_models]

    def get_for_user(
        self,
        user_id: int,
        active_only: bool = True
    ) -> List[ScheduleEntity]:
        query = self.db.query(ScheduleModel).filter(
            ScheduleModel.user_id == user_id
        )
        
        if active_only:
            query = query.filter(
                ScheduleModel.processed == False
            )
            
        schedule_models = query.order_by(
            ScheduleModel.scheduled_time.asc()
        ).all()
        
        return [self.mapper.to_entity(model) for model in schedule_models]

    def get_for_carer(
        self,
        carer_id: int,
        active_only: bool = True
    ) -> List[ScheduleEntity]:
        query = self.db.query(ScheduleModel).filter(
            ScheduleModel.carer_id == carer_id
        )
        
        if active_only:
            query = query.filter(
                ScheduleModel.processed == False
            )
            
        schedule_models = query.order_by(
            ScheduleModel.scheduled_time.asc()
        ).all()
        
        return [self.mapper.to_entity(model) for model in schedule_models]

    def update(self, schedule: ScheduleEntity) -> ScheduleEntity:
        schedule_model = self.mapper.to_model(schedule)
        self.db.merge(schedule_model)
        self.db.commit()
        self.db.refresh(schedule_model)
        return self.mapper.to_entity(schedule_model)

    def delete(self, schedule_id: int) -> bool:
        result = self.db.query(ScheduleModel).filter(
            ScheduleModel.id == schedule_id
        ).delete()
        self.db.commit()
        return result > 0
