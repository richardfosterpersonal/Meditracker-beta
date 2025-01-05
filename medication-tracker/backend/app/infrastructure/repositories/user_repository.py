"""User repository implementation."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.domain.user.repositories import UserRepository, CarerRepository
from app.domain.user.entities import User, Carer
from app.infrastructure.database.models import User as UserModel, Carer as CarerModel
from app.infrastructure.mappers.user_mapper import UserMapper, CarerMapper

class SQLUserRepository(UserRepository):
    def __init__(self, db: Session):
        self.db = db
        self.mapper = UserMapper()

    def save(self, user: User) -> User:
        user_model = self.mapper.to_model(user)
        if user_model.id:
            self.db.merge(user_model)
        else:
            self.db.add(user_model)
        self.db.commit()
        self.db.refresh(user_model)
        return self.mapper.to_entity(user_model)

    def get_by_id(self, user_id: int) -> Optional[User]:
        user_model = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        return self.mapper.to_entity(user_model) if user_model else None

    def get_by_email(self, email: str) -> Optional[User]:
        user_model = self.db.query(UserModel).filter(UserModel.email == email).first()
        return self.mapper.to_entity(user_model) if user_model else None

    def update(self, user: User) -> User:
        user_model = self.mapper.to_model(user)
        self.db.merge(user_model)
        self.db.commit()
        self.db.refresh(user_model)
        return self.mapper.to_entity(user_model)

    def delete(self, user_id: int) -> bool:
        result = self.db.query(UserModel).filter(UserModel.id == user_id).delete()
        self.db.commit()
        return result > 0

    def get_users_needing_sync(self, batch_size: int, sync_interval_minutes: int) -> List[User]:
        """Get users who need their medication data synchronized.
        
        Args:
            batch_size: Maximum number of users to return
            sync_interval_minutes: Number of minutes after which a user needs resync
            
        Returns:
            List of users needing synchronization
        """
        from datetime import datetime, timedelta
        cutoff_time = datetime.utcnow() - timedelta(minutes=sync_interval_minutes)
        
        users = (
            self.db.query(UserModel)
            .filter(
                (UserModel.last_sync.is_(None)) |  # Never synced
                (UserModel.last_sync < cutoff_time)  # Sync is old
            )
            .limit(batch_size)
            .all()
        )
        
        return [self.mapper.to_entity(user) for user in users]

    def update_last_sync(self, user_id: int, sync_time: datetime) -> None:
        """Update the last sync time for a user.
        
        Args:
            user_id: ID of the user to update
            sync_time: Time of the last successful sync
        """
        user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if user:
            user.last_sync = sync_time
            self.db.commit()

class SQLCarerRepository(CarerRepository):
    def __init__(self, db: Session):
        self.db = db
        self.mapper = CarerMapper()

    def save(self, carer: Carer) -> Carer:
        carer_model = self.mapper.to_model(carer)
        if carer_model.id:
            self.db.merge(carer_model)
        else:
            self.db.add(carer_model)
        self.db.commit()
        self.db.refresh(carer_model)
        return self.mapper.to_entity(carer_model)

    def get_by_id(self, carer_id: int) -> Optional[Carer]:
        carer_model = self.db.query(CarerModel).filter(CarerModel.id == carer_id).first()
        return self.mapper.to_entity(carer_model) if carer_model else None

    def get_by_user_id(self, user_id: int) -> Optional[Carer]:
        carer_model = self.db.query(CarerModel).filter(CarerModel.user_id == user_id).first()
        return self.mapper.to_entity(carer_model) if carer_model else None

    def get_for_patient(self, patient_id: int) -> List[Carer]:
        carer_models = (
            self.db.query(CarerModel)
            .join(CarerModel.assignments)
            .filter(CarerModel.assignments.any(patient_id=patient_id))
            .all()
        )
        return [self.mapper.to_entity(model) for model in carer_models]

    def update(self, carer: Carer) -> Carer:
        carer_model = self.mapper.to_model(carer)
        self.db.merge(carer_model)
        self.db.commit()
        self.db.refresh(carer_model)
        return self.mapper.to_entity(carer_model)

    def delete(self, carer_id: int) -> bool:
        result = self.db.query(CarerModel).filter(CarerModel.id == carer_id).delete()
        self.db.commit()
        return result > 0
