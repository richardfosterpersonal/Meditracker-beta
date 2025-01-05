from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from .entities import Notification, NotificationSchedule

class NotificationRepository(ABC):
    @abstractmethod
    def save(self, notification: Notification) -> Notification:
        """Save a notification entity"""
        pass

    @abstractmethod
    def get_by_id(self, notification_id: int) -> Optional[Notification]:
        """Get a notification by its ID"""
        pass

    @abstractmethod
    def get_for_user(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        pass

    @abstractmethod
    def get_for_carer(
        self,
        carer_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a carer"""
        pass

    @abstractmethod
    def mark_as_read(self, notification_ids: List[int]) -> bool:
        """Mark notifications as read"""
        pass

    @abstractmethod
    def delete(self, notification_id: int) -> bool:
        """Delete a notification"""
        pass

class NotificationScheduleRepository(ABC):
    @abstractmethod
    def save(self, schedule: NotificationSchedule) -> NotificationSchedule:
        """Save a notification schedule"""
        pass

    @abstractmethod
    def get_by_id(self, schedule_id: int) -> Optional[NotificationSchedule]:
        """Get a schedule by its ID"""
        pass

    @abstractmethod
    def get_due_schedules(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[NotificationSchedule]:
        """Get schedules due between start_time and end_time"""
        pass

    @abstractmethod
    def get_for_user(
        self,
        user_id: int,
        active_only: bool = True
    ) -> List[NotificationSchedule]:
        """Get schedules for a user"""
        pass

    @abstractmethod
    def get_for_carer(
        self,
        carer_id: int,
        active_only: bool = True
    ) -> List[NotificationSchedule]:
        """Get schedules for a carer"""
        pass

    @abstractmethod
    def update(self, schedule: NotificationSchedule) -> NotificationSchedule:
        """Update a schedule"""
        pass

    @abstractmethod
    def delete(self, schedule_id: int) -> bool:
        """Delete a schedule"""
        pass
