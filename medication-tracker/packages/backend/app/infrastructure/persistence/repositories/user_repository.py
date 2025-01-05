from typing import List, Optional
from sqlalchemy.orm import Session
from app.domain.user.repositories import UserRepository, CarerRepository, CarerAssignmentRepository
from app.domain.user.entities import User, Carer, CarerAssignment, NotificationPreference
from app.infrastructure.persistence.models.user import UserModel, CarerModel, CarerAssignmentModel

class SQLUserRepository(UserRepository):
    def __init__(self, session: Session):
        self._session = session

    def save(self, user: User) -> User:
        model = UserModel(
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
            email_verified=user.email_verified,
            notification_preferences=user.notification_preferences.__dict__,
            push_subscription=user.push_subscription,
            last_login=user.last_login,
            is_admin=user.is_admin,
            is_carer=user.is_carer
        )
        self._session.add(model)
        self._session.commit()
        return self._to_entity(model)

    def get_by_id(self, user_id: int) -> Optional[User]:
        model = self._session.query(UserModel).get(user_id)
        return self._to_entity(model) if model else None

    def get_by_email(self, email: str) -> Optional[User]:
        model = self._session.query(UserModel).filter(
            UserModel.email == email
        ).first()
        return self._to_entity(model) if model else None

    def update(self, user: User) -> User:
        model = self._session.query(UserModel).get(user.id)
        if not model:
            raise ValueError(f"User with id {user.id} not found")

        model.name = user.name
        model.email = user.email
        model.password_hash = user.password_hash
        model.email_verified = user.email_verified
        model.notification_preferences = user.notification_preferences.__dict__
        model.push_subscription = user.push_subscription
        model.last_login = user.last_login
        model.is_admin = user.is_admin
        model.is_carer = user.is_carer

        self._session.commit()
        return self._to_entity(model)

    def delete(self, user_id: int) -> bool:
        model = self._session.query(UserModel).get(user_id)
        if model:
            self._session.delete(model)
            self._session.commit()
            return True
        return False

    def _to_entity(self, model: UserModel) -> User:
        if not model:
            return None
        return User(
            id=model.id,
            name=model.name,
            email=model.email,
            password_hash=model.password_hash,
            email_verified=model.email_verified,
            notification_preferences=NotificationPreference(**model.notification_preferences),
            push_subscription=model.push_subscription,
            last_login=model.last_login,
            is_admin=model.is_admin,
            is_carer=model.is_carer,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

class SQLCarerRepository(CarerRepository):
    def __init__(self, session: Session):
        self._session = session

    def save(self, carer: Carer) -> Carer:
        model = CarerModel(
            user_id=carer.user_id,
            type=carer.type,
            verified=carer.verified,
            qualifications=carer.qualifications,
            patients=carer.patients
        )
        self._session.add(model)
        self._session.commit()
        return self._to_entity(model)

    def get_by_id(self, carer_id: int) -> Optional[Carer]:
        model = self._session.query(CarerModel).get(carer_id)
        return self._to_entity(model) if model else None

    def get_by_user_id(self, user_id: int) -> Optional[Carer]:
        model = self._session.query(CarerModel).filter(
            CarerModel.user_id == user_id
        ).first()
        return self._to_entity(model) if model else None

    def get_for_patient(self, patient_id: int) -> List[Carer]:
        models = self._session.query(CarerModel).filter(
            CarerModel.patients.contains([patient_id])
        ).all()
        return [self._to_entity(model) for model in models]

    def update(self, carer: Carer) -> Carer:
        model = self._session.query(CarerModel).get(carer.id)
        if not model:
            raise ValueError(f"Carer with id {carer.id} not found")

        model.user_id = carer.user_id
        model.type = carer.type
        model.verified = carer.verified
        model.qualifications = carer.qualifications
        model.patients = carer.patients

        self._session.commit()
        return self._to_entity(model)

    def delete(self, carer_id: int) -> bool:
        model = self._session.query(CarerModel).get(carer_id)
        if model:
            self._session.delete(model)
            self._session.commit()
            return True
        return False

    def _to_entity(self, model: CarerModel) -> Carer:
        if not model:
            return None
        return Carer(
            id=model.id,
            user_id=model.user_id,
            type=model.type,
            verified=model.verified,
            qualifications=model.qualifications,
            patients=model.patients,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

class SQLCarerAssignmentRepository(CarerAssignmentRepository):
    def __init__(self, session: Session):
        self._session = session

    def save(self, assignment: CarerAssignment) -> CarerAssignment:
        model = CarerAssignmentModel(
            carer_id=assignment.carer_id,
            patient_id=assignment.patient_id,
            permissions=assignment.permissions,
            active=assignment.active
        )
        self._session.add(model)
        self._session.commit()
        return self._to_entity(model)

    def get_by_id(self, assignment_id: int) -> Optional[CarerAssignment]:
        model = self._session.query(CarerAssignmentModel).get(assignment_id)
        return self._to_entity(model) if model else None

    def get_by_carer_and_patient(
        self,
        carer_id: int,
        patient_id: int
    ) -> Optional[CarerAssignment]:
        model = self._session.query(CarerAssignmentModel).filter(
            CarerAssignmentModel.carer_id == carer_id,
            CarerAssignmentModel.patient_id == patient_id,
            CarerAssignmentModel.active == True
        ).first()
        return self._to_entity(model) if model else None

    def get_active_for_patient(self, patient_id: int) -> List[CarerAssignment]:
        models = self._session.query(CarerAssignmentModel).filter(
            CarerAssignmentModel.patient_id == patient_id,
            CarerAssignmentModel.active == True
        ).all()
        return [self._to_entity(model) for model in models]

    def get_active_for_carer(self, carer_id: int) -> List[CarerAssignment]:
        models = self._session.query(CarerAssignmentModel).filter(
            CarerAssignmentModel.carer_id == carer_id,
            CarerAssignmentModel.active == True
        ).all()
        return [self._to_entity(model) for model in models]

    def update(self, assignment: CarerAssignment) -> CarerAssignment:
        model = self._session.query(CarerAssignmentModel).get(assignment.id)
        if not model:
            raise ValueError(f"Assignment with id {assignment.id} not found")

        model.carer_id = assignment.carer_id
        model.patient_id = assignment.patient_id
        model.permissions = assignment.permissions
        model.active = assignment.active

        self._session.commit()
        return self._to_entity(model)

    def delete(self, assignment_id: int) -> bool:
        model = self._session.query(CarerAssignmentModel).get(assignment_id)
        if model:
            self._session.delete(model)
            self._session.commit()
            return True
        return False

    def _to_entity(self, model: CarerAssignmentModel) -> CarerAssignment:
        if not model:
            return None
        return CarerAssignment(
            id=model.id,
            carer_id=model.carer_id,
            patient_id=model.patient_id,
            permissions=model.permissions,
            active=model.active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
