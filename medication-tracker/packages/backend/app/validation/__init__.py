"""
Validation Package
Last Updated: 2024-12-26T22:52:03+01:00
"""

from enum import Enum

class ValidationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
