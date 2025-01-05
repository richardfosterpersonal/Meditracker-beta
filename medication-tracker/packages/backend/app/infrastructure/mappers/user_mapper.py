from typing import Optional
from app.domain.user.entities import User as UserEntity, Carer as CarerEntity
from app.infrastructure.database.models import User as UserModel, Carer as CarerModel
from .base_mapper import BaseMapper

class UserMapper(BaseMapper[UserEntity, UserModel]):
    def to_entity(self, model: UserModel) -> UserEntity:
        if not model:
            return None
            
        return UserEntity(
            name=model.name,
            email=model.email,
            password_hash=model.password_hash,
            email_verified=model.email_verified,
            notification_preferences=model.notification_preferences,
            push_subscription=model.push_subscription,
            last_login=model.last_login,
            is_admin=model.is_admin,
            is_carer=model.is_carer,
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

    def to_model(self, entity: UserEntity) -> UserModel:
        if not entity:
            return None
            
        return UserModel(
            id=entity.id,
            name=entity.name,
            email=entity.email,
            password_hash=entity.password_hash,
            email_verified=entity.email_verified,
            notification_preferences=entity.notification_preferences.__dict__,
            push_subscription=entity.push_subscription,
            last_login=entity.last_login,
            is_admin=entity.is_admin,
            is_carer=entity.is_carer,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

class CarerMapper(BaseMapper[CarerEntity, CarerModel]):
    def to_entity(self, model: CarerModel) -> CarerEntity:
        if not model:
            return None
            
        return CarerEntity(
            user_id=model.user_id,
            type=model.type,
            verified=model.verified,
            qualifications=model.qualifications,
            patients=[assignment.patient_id for assignment in model.assignments if assignment.active],
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

    def to_model(self, entity: CarerEntity) -> CarerModel:
        if not entity:
            return None
            
        return CarerModel(
            id=entity.id,
            user_id=entity.user_id,
            type=entity.type,
            verified=entity.verified,
            qualifications=entity.qualifications,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
