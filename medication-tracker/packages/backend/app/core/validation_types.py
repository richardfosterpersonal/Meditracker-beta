"""Validation Types Module

This module defines the types and enums used in the validation framework.
"""

from enum import Enum, auto
from typing import Dict, Any, Optional, List

class ValidationStatus(Enum):
    """Validation status enum"""
    PENDING = auto()
    IN_PROGRESS = auto()
    COMPLETED = auto()
    FAILED = auto()
    SKIPPED = auto()

class ValidationLevel(Enum):
    """Validation level enum"""
    DEBUG = auto()
    INFO = auto()
    WARNING = auto()
    ERROR = auto()
    CRITICAL = auto()

class ValidationStage(Enum):
    """Validation stage enum"""
    PRE_VALIDATION = auto()
    BOOTSTRAP = auto()
    CONFIGURATION = auto()
    DEPENDENCIES = auto()
    SECURITY = auto()
    DATABASE = auto()
    RESOURCES = auto()
    METRICS = auto()
    ENVIRONMENT = auto()
    MONITORING = auto()
    POST_VALIDATION = auto()
    POST_LAUNCH = auto()

class HookCompetencyLevel(Enum):
    """Hook competency level enum"""
    LOW = auto()
    MEDIUM = auto()
    HIGH = auto()
    EXPERT = auto()
    CRITICAL = auto()

class ValidationResult:
    """Validation result class"""
    
    def __init__(
        self,
        valid: bool,
        message: str,
        level: ValidationLevel = ValidationLevel.INFO,
        details: Optional[Dict[str, Any]] = None
    ):
        self.valid = valid
        self.message = message
        self.level = level
        self.details = details or {}
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "valid": self.valid,
            "message": self.message,
            "level": self.level.name,
            "details": self.details
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationResult':
        """Create from dictionary"""
        return cls(
            valid=data["valid"],
            message=data["message"],
            level=ValidationLevel[data["level"]],
            details=data.get("details", {})
        )
