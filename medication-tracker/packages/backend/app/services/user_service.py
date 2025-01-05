from typing import Optional, List
from app.infrastructure.persistence.database import Database
from app.infrastructure.persistence.models.user import UserModel
from app.services.audit_service import AuditService

class UserService:
    def __init__(self, db: Database):
        self.db = db
        self.audit_service = AuditService()

    def get_user_by_id(self, user_id: int) -> Optional[UserModel]:
        return self.db.session.query(UserModel).filter(UserModel.id == user_id).first()

    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        return self.db.session.query(UserModel).filter(UserModel.username == username).first()

    def get_user_by_email(self, email: str) -> Optional[UserModel]:
        return self.db.session.query(UserModel).filter(UserModel.email == email).first()

    def get_all_users(self) -> List[UserModel]:
        return self.db.session.query(UserModel).all()

    def create_user(self, username: str, email: str, password: str) -> UserModel:
        user = UserModel(
            username=username,
            email=email,
            password=password
        )
        self.db.session.add(user)
        self.db.session.commit()
        
        self.audit_service.log_event(
            event_type="user_created",
            user_id=str(user.id),
            details={"username": username, "email": email}
        )
        
        return user

    def update_user(self, user_id: int, **kwargs) -> Optional[UserModel]:
        user = self.get_user_by_id(user_id)
        if not user:
            return None

        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        self.db.session.commit()
        
        self.audit_service.log_event(
            event_type="user_updated",
            user_id=str(user_id),
            details=kwargs
        )
        
        return user

    def delete_user(self, user_id: int) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            return False

        self.db.session.delete(user)
        self.db.session.commit()
        
        self.audit_service.log_event(
            event_type="user_deleted",
            user_id=str(user_id),
            details={"username": user.username}
        )
        
        return True
