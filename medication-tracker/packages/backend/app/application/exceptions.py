class ApplicationError(Exception):
    """Base application error"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class ValidationError(ApplicationError):
    """Raised when input validation fails"""
    pass

class NotFoundException(ApplicationError):
    """Raised when a requested resource is not found"""
    pass

class UnauthorizedError(ApplicationError):
    """Raised when a user is not authorized to perform an action"""
    pass

class ConflictError(ApplicationError):
    """Raised when there is a conflict with existing data"""
    pass

class ExternalServiceError(ApplicationError):
    """Raised when an external service fails"""
    pass
