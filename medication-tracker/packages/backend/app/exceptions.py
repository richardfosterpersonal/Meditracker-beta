"""
Application Exceptions
Critical Path: EXCEPTIONS
Last Updated: 2025-01-02T14:13:50+01:00
"""

class MedicationTrackerError(Exception):
    """Base exception for all application errors"""
    pass

class BaseError(MedicationTrackerError):
    """Base error class for all custom exceptions"""
    pass

class ValidationError(BaseError):
    """Raised when validation fails"""
    pass

class AuthenticationError(BaseError):
    """Raised when authentication fails"""
    pass

class AuthorizationError(BaseError):
    """Raised when authorization fails"""
    pass

class ConfigurationError(BaseError):
    """Raised when configuration is invalid"""
    pass

class ContextError(BaseError):
    """Raised when context is invalid or missing"""
    pass

class DatabaseError(BaseError):
    """Raised when database operations fail"""
    pass

class NotificationError(BaseError):
    """Raised when notification operations fail"""
    pass

class ResourceNotFoundError(BaseError):
    """Raised when a requested resource is not found"""
    pass

class ResourceConflictError(BaseError):
    """Raised when there is a conflict with existing resources"""
    pass

class ServiceError(BaseError):
    """Raised when a service operation fails"""
    pass

class ThirdPartyError(BaseError):
    """Raised when third-party service operations fail"""
    pass

class ProcessError(ValidationError):
    """Raised when process validation fails"""
    pass

class BootstrapError(ValidationError):
    """Raised when bootstrap validation fails"""
    pass

class PreValidationError(ValidationError):
    """Raised when pre-validation fails"""
    pass

class ValidationHookError(ValidationError):
    """Raised when validation hook fails"""
    pass

class DocumentationError(ValidationError):
    """Raised when documentation validation fails"""
    pass

class DependencyError(ValidationError):
    """Raised when dependency validation fails"""
    pass

class BetaLaunchError(MedicationTrackerError):
    """Raised when beta launch fails"""
    pass

class ImportValidationError(ValidationError):
    """Raised when import validation fails"""
    pass

class PathValidationError(ValidationError):
    """Raised when path validation fails"""
    pass

class ResourceValidationError(ValidationError):
    """Raised when resource validation fails"""
    pass

class MetricsValidationError(ValidationError):
    """Raised when metrics validation fails"""
    pass

class EnvironmentValidationError(ValidationError):
    """Raised when environment validation fails"""
    pass

class APIError(MedicationTrackerError):
    """Raised when API operations fail"""
    pass

class ReminderError(MedicationTrackerError):
    """Raised when reminder operations fail"""
    pass

class SchedulingError(MedicationTrackerError):
    """Raised when scheduling operations fail"""
    pass

class MedicationError(MedicationTrackerError):
    """Raised when medication operations fail"""
    pass

class UserError(MedicationTrackerError):
    """Raised when user operations fail"""
    pass

class FileOperationError(MedicationTrackerError):
    """Raised when file operations fail"""
    pass

class CacheError(MedicationTrackerError):
    """Raised when cache operations fail"""
    pass

class LoggingError(MedicationTrackerError):
    """Raised when logging operations fail"""
    pass

class MonitoringError(MedicationTrackerError):
    """Raised when monitoring operations fail"""
    pass

class BackupError(MedicationTrackerError):
    """Raised when backup operations fail"""
    pass

class RestoreError(MedicationTrackerError):
    """Raised when restore operations fail"""
    pass

class MigrationError(MedicationTrackerError):
    """Raised when migration operations fail"""
    pass

class MaintenanceError(MedicationTrackerError):
    """Raised when maintenance operations fail"""
    pass

class PerformanceError(MedicationTrackerError):
    """Raised when performance requirements are not met"""
    pass

class SecurityError(MedicationTrackerError):
    """Raised when security requirements are not met"""
    pass

class ComplianceError(MedicationTrackerError):
    """Raised when compliance requirements are not met"""
    pass

class AuditError(MedicationTrackerError):
    """Raised when audit operations fail"""
    pass

class ReportingError(MedicationTrackerError):
    """Raised when reporting operations fail"""
    pass

class IntegrationError(MedicationTrackerError):
    """Raised when integration operations fail"""
    pass

class ExportError(MedicationTrackerError):
    """Raised when export operations fail"""
    pass

class ImportError(MedicationTrackerError):
    """Raised when import operations fail"""
    pass

class ValidationStateError(ValidationError):
    """Raised when validation state is invalid"""
    pass

class ValidationSequenceError(ValidationError):
    """Raised when validation sequence is invalid"""
    pass

class ValidationDependencyError(ValidationError):
    """Raised when validation dependencies are not met"""
    pass

class ValidationTimeoutError(ValidationError):
    """Raised when validation times out"""
    pass

class ValidationConcurrencyError(ValidationError):
    """Raised when validation concurrency fails"""
    pass

class ValidationRollbackError(ValidationError):
    """Raised when validation rollback fails"""
    pass

class ValidationRecoveryError(ValidationError):
    """Raised when validation recovery fails"""
    pass

class ValidationCleanupError(ValidationError):
    """Raised when validation cleanup fails"""
    pass

class ArchitectureError(MedicationTrackerError):
    """Raised when there is an error in the code architecture"""
    pass

class PathError(MedicationTrackerError):
    """Raised when there is an error with file paths"""
    pass

class HookError(MedicationTrackerError):
    """Raised when there is an error with validation hooks"""
    pass

class MetricsError(MedicationTrackerError):
    """Raised when there is an error collecting metrics"""
    pass

class EvidenceError(MedicationTrackerError):
    """Raised when there is an error collecting evidence"""
    pass

class AlertError(MedicationTrackerError):
    """Raised when there is an error with alerts"""
    pass

class RequirementError(ValidationError):
    """Raised when requirements are not met"""
    pass

class ScopeError(BaseError):
    """Raised when operation is out of scope"""
    pass

class BetaValidationError(ValidationError):
    """Raised when beta validation fails"""
    pass

class BetaUserError(ValidationError):
    """Raised when beta user management fails"""
    pass

class BetaDataError(ValidationError):
    """Raised when beta data management fails"""
    pass

class BetaMetricsError(ValidationError):
    """Raised when beta metrics collection fails"""
    pass

# Export all exceptions
__all__ = [
    'MedicationTrackerError',
    'BaseError',
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'ConfigurationError',
    'ContextError',
    'DatabaseError',
    'NotificationError',
    'ResourceNotFoundError',
    'ResourceConflictError',
    'ServiceError',
    'ThirdPartyError',
    'ProcessError',
    'BootstrapError',
    'PreValidationError',
    'ValidationHookError',
    'DocumentationError',
    'DependencyError',
    'BetaLaunchError',
    'ImportValidationError',
    'PathValidationError',
    'ResourceValidationError',
    'MetricsValidationError',
    'EnvironmentValidationError',
    'APIError',
    'ReminderError',
    'SchedulingError',
    'MedicationError',
    'UserError',
    'FileOperationError',
    'CacheError',
    'LoggingError',
    'MonitoringError',
    'BackupError',
    'RestoreError',
    'MigrationError',
    'MaintenanceError',
    'PerformanceError',
    'SecurityError',
    'ComplianceError',
    'AuditError',
    'ReportingError',
    'IntegrationError',
    'ExportError',
    'ImportError',
    'ValidationStateError',
    'ValidationSequenceError',
    'ValidationDependencyError',
    'ValidationTimeoutError',
    'ValidationConcurrencyError',
    'ValidationRollbackError',
    'ValidationRecoveryError',
    'ValidationCleanupError',
    'ArchitectureError',
    'PathError',
    'HookError',
    'MetricsError',
    'EvidenceError',
    'AlertError',
    'RequirementError',
    'ScopeError',
    'BetaValidationError',
    'BetaUserError',
    'BetaDataError',
    'BetaMetricsError'
]
