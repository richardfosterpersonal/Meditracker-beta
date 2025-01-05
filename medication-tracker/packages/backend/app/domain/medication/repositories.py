from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from .entities import Medication

class MedicationRepository(ABC):
    @abstractmethod
    def save(self, medication: Medication) -> Medication:
        """Save a medication entity"""
        pass

    @abstractmethod
    def get_by_id(self, medication_id: int) -> Optional[Medication]:
        """Get a medication by its ID"""
        pass

    @abstractmethod
    def get_by_user_id(self, user_id: int) -> List[Medication]:
        """Get all medications for a user"""
        pass

    @abstractmethod
    def get_due_medications(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[Medication]:
        """Get medications due between start_time and end_time"""
        pass

    @abstractmethod
    def delete(self, medication_id: int) -> bool:
        """Delete a medication"""
        pass

    @abstractmethod
    def update(self, medication: Medication) -> Medication:
        """Update a medication"""
        pass
