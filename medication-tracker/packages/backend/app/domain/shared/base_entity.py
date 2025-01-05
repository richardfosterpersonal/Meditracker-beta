from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field

@dataclass
class BaseEntity:
    id: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def update_timestamp(self):
        self.updated_at = datetime.utcnow()
