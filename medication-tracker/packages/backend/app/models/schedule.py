from dataclasses import dataclass
from datetime import datetime, time
from typing import List, Optional

@dataclass
class Schedule:
    """Represents a medication schedule."""
    id: Optional[int] = None
    times: List[time] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    frequency: str = "daily"  # daily, weekly, monthly
    days_of_week: List[int] = None  # 0-6 for Monday-Sunday
    days_of_month: List[int] = None  # 1-31
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.times is None:
            self.times = []
        if self.days_of_week is None:
            self.days_of_week = []
        if self.days_of_month is None:
            self.days_of_month = []
