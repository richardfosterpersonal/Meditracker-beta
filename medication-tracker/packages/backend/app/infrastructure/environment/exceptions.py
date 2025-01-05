"""
Environment Validation Exceptions
Critical Path: VALIDATION-ENV-EXCEPTION-*
Last Updated: 2024-12-26T22:39:16+01:00
"""
from typing import Optional

class ValidationError(Exception):
    """Base validation error"""
    def __init__(
        self,
        message: str,
        validation_code: Optional[str] = None,
        component: Optional[str] = None
    ):
        self.message = message
        self.validation_code = validation_code
        self.component = component
        super().__init__(self.format_message())

    def format_message(self) -> str:
        """Format error message with validation details"""
        parts = [self.message]
        if self.validation_code:
            parts.append(f"Validation Code: {self.validation_code}")
        if self.component:
            parts.append(f"Component: {self.component}")
        return " | ".join(parts)

class PreValidationError(ValidationError):
    """Pre-validation specific error"""
    def __init__(
        self,
        message: str,
        validation_code: Optional[str] = None,
        component: Optional[str] = None
    ):
        super().__init__(
            f"Pre-validation Error: {message}",
            validation_code,
            component
        )

class EnvironmentValidationError(ValidationError):
    """Environment validation specific error"""
    def __init__(
        self,
        message: str,
        validation_code: Optional[str] = None,
        component: Optional[str] = None
    ):
        super().__init__(
            f"Environment Validation Error: {message}",
            validation_code,
            component
        )

class ValidationChainError(ValidationError):
    """Validation chain specific error"""
    def __init__(
        self,
        message: str,
        validation_code: Optional[str] = None,
        component: Optional[str] = None
    ):
        super().__init__(
            f"Validation Chain Error: {message}",
            validation_code,
            component
        )
