"""
Core Models
Last Updated: 2024-12-27T20:18:32+01:00
Critical Path: Core Models
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime

@dataclass
class ValidationResult:
    """Result of a validation check"""
    is_valid: bool
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now()
