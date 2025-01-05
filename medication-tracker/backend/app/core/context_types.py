"""
Context Types and Enums
Critical Path: VALIDATION-CORE-*
Last Updated: 2025-01-01T20:57:30+01:00
"""

from enum import Enum, auto

class ContextLevel(Enum):
    """Context levels for validation"""
    SYSTEM = auto()
    COMPONENT = auto()
    FEATURE = auto()
    TASK = auto()
    VALIDATION = auto()
    BETA = auto()
