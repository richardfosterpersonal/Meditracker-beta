"""
Core Exceptions
Custom exceptions for the application
Last Updated: 2024-12-31T15:38:11+01:00
"""

class BetaError(Exception):
    """Base exception for beta-related errors"""
    pass

class ValidationError(BetaError):
    """Raised when validation fails"""
    pass

class ProcessError(BetaError):
    """Raised when a process fails"""
    pass

class EvidenceError(BetaError):
    """Raised when evidence collection fails"""
    pass

class ConfigurationError(BetaError):
    """Raised when configuration is invalid"""
    pass

class SecurityError(BetaError):
    """Raised when security validation fails"""
    pass

class NotificationError(BetaError):
    """Raised when notification delivery fails"""
    pass

class DatabaseError(BetaError):
    """Raised when database operations fail"""
    pass

class AuthenticationError(BetaError):
    """Raised when authentication fails"""
    pass

class AuthorizationError(BetaError):
    """Raised when authorization fails"""
    pass
