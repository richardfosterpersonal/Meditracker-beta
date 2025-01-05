from abc import ABC, abstractmethod
from typing import List, Optional
from .entities import User, Carer, CarerAssignment

class UserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> User:
        """Save a user entity"""
        pass

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by their ID"""
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by their email"""
        pass

    @abstractmethod
    def update(self, user: User) -> User:
        """Update a user"""
        pass

    @abstractmethod
    def delete(self, user_id: int) -> bool:
        """Delete a user"""
        pass

class CarerRepository(ABC):
    @abstractmethod
    def save(self, carer: Carer) -> Carer:
        """Save a carer entity"""
        pass

    @abstractmethod
    def get_by_id(self, carer_id: int) -> Optional[Carer]:
        """Get a carer by their ID"""
        pass

    @abstractmethod
    def get_by_user_id(self, user_id: int) -> Optional[Carer]:
        """Get a carer by their user ID"""
        pass

    @abstractmethod
    def get_for_patient(self, patient_id: int) -> List[Carer]:
        """Get all carers for a patient"""
        pass

    @abstractmethod
    def update(self, carer: Carer) -> Carer:
        """Update a carer"""
        pass

    @abstractmethod
    def delete(self, carer_id: int) -> bool:
        """Delete a carer"""
        pass

class CarerAssignmentRepository(ABC):
    @abstractmethod
    def save(self, assignment: CarerAssignment) -> CarerAssignment:
        """Save a carer assignment"""
        pass

    @abstractmethod
    def get_by_id(self, assignment_id: int) -> Optional[CarerAssignment]:
        """Get an assignment by ID"""
        pass

    @abstractmethod
    def get_by_carer_and_patient(
        self,
        carer_id: int,
        patient_id: int
    ) -> Optional[CarerAssignment]:
        """Get an assignment by carer and patient IDs"""
        pass

    @abstractmethod
    def get_active_for_patient(self, patient_id: int) -> List[CarerAssignment]:
        """Get all active assignments for a patient"""
        pass

    @abstractmethod
    def get_active_for_carer(self, carer_id: int) -> List[CarerAssignment]:
        """Get all active assignments for a carer"""
        pass

    @abstractmethod
    def update(self, assignment: CarerAssignment) -> CarerAssignment:
        """Update an assignment"""
        pass

    @abstractmethod
    def delete(self, assignment_id: int) -> bool:
        """Delete an assignment"""
        pass
