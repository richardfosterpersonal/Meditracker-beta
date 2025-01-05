from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class BaseDTO:
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

@dataclass
class BaseResponseDTO(BaseDTO):
    success: bool = True
    error: Optional[str] = None
    message: Optional[str] = None
