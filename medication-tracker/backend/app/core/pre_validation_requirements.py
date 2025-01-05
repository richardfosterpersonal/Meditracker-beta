"""
Pre-validation requirements for beta testing
Critical Path: VALIDATION-PRE-*
Last Updated: 2025-01-02T10:56:29+01:00
"""

from enum import Enum
from pathlib import Path
import os
import sys
import json
import logging
from typing import Dict, Any, List, Set, Optional
import psutil
import requests

from .import_validator import ImportValidator, ImportValidationError
from .debug_validation import DebugValidator
from .conversation_enforcer import ConversationEnforcer
from .path_validator import PathValidator, PathValidationError
from .architecture_validator import ArchitectureValidator

logger = logging.getLogger(__name__)

class PreValidationRequirement(Enum):
    """Pre-validation requirements that must be met"""
    # System Requirements
    TEST_ENVIRONMENT_READY = "test_environment_ready"
    SYSTEM_DEPENDENCIES_READY = "system_dependencies_ready"
    FILESYSTEM_DEPENDENCIES_READY = "filesystem_dependencies_ready"
    CODE_DEPENDENCIES_READY = "code_dependencies_ready"
    SYSTEM_RESOURCES_READY = "system_resources_ready"
    NETWORK_READY = "network_ready"
    
    # Core Requirements
    DATABASE_READY = "database_ready"
    CONFIG_LOADED = "config_loaded"
    LOGGING_CONFIGURED = "logging_configured"
    CRITICAL_PATHS_DEFINED = "critical_paths_defined"
    SECURITY_INITIALIZED = "security_initialized"
    MONITORING_READY = "monitoring_ready"
    BACKUP_SYSTEM_READY = "backup_system_ready"
    NOTIFICATION_SYSTEM_READY = "notification_system_ready"
    
    # Beta Requirements
    BETA_FEATURE_FLAGS_READY = "beta_feature_flags_ready"
    BETA_USER_MANAGEMENT_READY = "beta_user_management_ready"
    BETA_DATA_ISOLATION_READY = "beta_data_isolation_ready"
    BETA_MONITORING_READY = "beta_monitoring_ready"
    BETA_FEEDBACK_READY = "beta_feedback_ready"
    BETA_ROLLBACK_READY = "beta_rollback_ready"
    
    # Recovery Requirements
    ROLLBACK_PROCEDURES_READY = "rollback_procedures_ready"
    BACKUP_RESTORE_READY = "backup_restore_ready"
    EMERGENCY_PROCEDURES_READY = "emergency_procedures_ready"
    
    # Validation Requirements
    VALIDATION_CHAIN_READY = "validation_chain_ready"
    VALIDATION_EVIDENCE_READY = "validation_evidence_ready"
    VALIDATION_METRICS_READY = "validation_metrics_ready"
    
    # Beta Launch Requirements
    BETA_LAUNCH_CHECKLIST_COMPLETE = "beta_launch_checklist_complete"
    BETA_ENVIRONMENT_READY = "beta_environment_ready"
    BETA_SUPPORT_READY = "beta_support_ready"
    BETA_METRICS_READY = "beta_metrics_ready"

class BetaValidationStatus(Enum):
    """Status of beta validation checks"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    CORRECTED = "corrected"
    ROLLED_BACK = "rolled_back"

class BetaValidationPriority(Enum):
    """Priority levels for beta validation"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class BetaValidationType(Enum):
    """Types of beta validation checks"""
    FEATURE_FLAG = "feature_flag"
    USER_MANAGEMENT = "user_management"
    DATA_ISOLATION = "data_isolation"
    MONITORING = "monitoring"
    FEEDBACK = "feedback"
    ROLLBACK = "rollback"

class BetaValidationScope(Enum):
    """Scope of beta validation"""
    SYSTEM = "system"
    COMPONENT = "component"
    FEATURE = "feature"
    USER = "user"
    DATA = "data"

class BetaLaunchRequirement(Enum):
    """Additional requirements specific to beta launch"""
    BETA_LAUNCH_CHECKLIST_COMPLETE = "beta_launch_checklist_complete"
    BETA_ENVIRONMENT_READY = "beta_environment_ready"
    BETA_SUPPORT_READY = "beta_support_ready"
    BETA_METRICS_READY = "beta_metrics_ready"

class BetaValidationResult:
    """Result of a beta validation check"""
    def __init__(
            self,
            requirement: PreValidationRequirement,
            status: BetaValidationStatus,
            priority: BetaValidationPriority,
            validation_type: BetaValidationType,
            scope: BetaValidationScope,
            message: str,
            timestamp: str,
            data: Optional[Dict] = None,
            corrective_action: Optional[str] = None
        ):
        self.requirement = requirement
        self.status = status
        self.priority = priority
        self.validation_type = validation_type
        self.scope = scope
        self.message = message
        self.timestamp = timestamp
        self.data = data or {}
        self.corrective_action = corrective_action

class PreValidationStatus:
    """Tracks pre-validation status"""
    def __init__(self):
        self._requirements: Set[PreValidationRequirement] = set()
        self._validated: Set[PreValidationRequirement] = set()
        
        # Initialize with all requirements
        for req in PreValidationRequirement:
            self._requirements.add(req)
            
    def mark_validated(self, requirement: PreValidationRequirement) -> None:
        """Mark a requirement as validated"""
        if requirement not in self._requirements:
            raise ValueError(f"Unknown requirement: {requirement}")
        self._validated.add(requirement)
        
    def is_validated(self, requirement: PreValidationRequirement) -> bool:
        """Check if a requirement is validated"""
        return requirement in self._validated
        
    def all_validated(self) -> bool:
        """Check if all requirements are validated"""
        return self._requirements == self._validated
        
    def get_pending(self) -> Set[PreValidationRequirement]:
        """Get pending requirements"""
        return self._requirements - self._validated

class PreValidationError(Exception):
    """Raised when pre-validation fails"""
    pass

class PreValidationManager:
    """Manages pre-validation requirements"""
    
    def __init__(self):
        self.status = PreValidationStatus()
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.path_validator = PathValidator(self.project_root)
        self.import_validator = ImportValidator(self.project_root)
        self.debug_validator = DebugValidator(self.project_root)
        self.conversation_enforcer = ConversationEnforcer(self.project_root)
        self.architecture_validator = ArchitectureValidator(self.project_root)
        
    def validate_paths(self) -> Dict[str, Any]:
        """Validate Python paths"""
        logger.info("Validating Python paths...")
        results = self.path_validator.validate_paths()
        if not results["valid"]:
            raise PreValidationError(
                "Path validation failed:\n" + 
                "\n".join(f"- {error}" for error in results["errors"])
            )
        return results
        
    def validate_imports(self) -> Dict[str, Any]:
        """Validate all imports"""
        logger.info("Validating imports...")
        results = self.import_validator.validate_imports()
        if not results["valid"]:
            raise PreValidationError(
                "Import validation failed:\n" + 
                "\n".join(f"- {error}" for error in results["errors"])
            )
        return results
        
    def validate_debug_practices(self) -> Dict[str, Any]:
        """Validate debug practices"""
        logger.info("Validating debug practices...")
        results = self.debug_validator.validate_debug_practices()
        if not results["valid"]:
            raise PreValidationError(
                "Debug validation failed:\n" + 
                "\n".join(f"- {issue['issue']}" for issue in results["results"]["issues_found"])
            )
        return results
        
    def validate_conversation_guidelines(self) -> Dict[str, Any]:
        """Validate conversation guidelines"""
        logger.info("Validating conversation guidelines...")
        results = self.conversation_enforcer.validate_guidelines()
        if not results["valid"]:
            raise PreValidationError(
                "Conversation guideline validation failed:\n" + 
                "\n".join(f"- {rec['recommendation']}" 
                         for rec in results["results"]["recommendations"])
            )
        return results
        
    def validate_code_architecture(self) -> Dict[str, Any]:
        """Validate code architecture and dependencies"""
        logger.info("Validating code architecture...")
        
        arch_validator = ArchitectureValidator(self.project_root)
        results = arch_validator.validate_architecture()
        
        if not results["valid"]:
            raise PreValidationError(
                "Architecture validation failed:\n" + 
                "\n".join(f"- {error}" for error in results["errors"])
            )
            
        return results
        
    def validate_requirement(self, requirement: PreValidationRequirement) -> None:
        """
        Validate a specific requirement
        
        Args:
            requirement: Requirement to validate
        """
        # Special handling for code dependencies
        if requirement == PreValidationRequirement.CODE_DEPENDENCIES_READY:
            # Validate paths first
            self.validate_paths()
            # Then validate imports
            self.validate_imports()
            
        # Run standard validation
        if requirement in CRITICAL_REQUIREMENTS:
            check_func = CRITICAL_REQUIREMENTS[requirement]["check"]
            error_msg = CRITICAL_REQUIREMENTS[requirement]["error"]
            fix_func = CRITICAL_REQUIREMENTS[requirement].get("fix")
            
            if not check_func():
                if fix_func:
                    logger.info(f"Attempting to fix {requirement}...")
                    if not fix_func():
                        raise PreValidationError(f"{error_msg} and could not be fixed")
                else:
                    raise PreValidationError(f"{error_msg}")
                
        self.status.mark_validated(requirement)
        
    def validate_all(self) -> None:
        """Validate all requirements"""
        # Start with path validation
        self.validate_paths()
        
        # Then validate imports
        self.validate_imports()
        
        # Validate code architecture
        self.validate_code_architecture()
        
        # Validate debug practices
        self.validate_debug_practices()
        
        # Validate conversation guidelines
        self.validate_conversation_guidelines()
        
        # Run all other validations
        for requirement in PreValidationRequirement:
            if not self.status.is_validated(requirement):
                self.validate_requirement(requirement)
                
    def get_validation_status(self) -> Dict[str, Any]:
        """Get current validation status"""
        return {
            "validated": list(self.status._validated),
            "pending": list(self.status.get_pending()),
            "all_validated": self.status.all_validated()
        }

# Hard-coded critical requirements with actual checks
CRITICAL_REQUIREMENTS = {
    # System Requirements
    PreValidationRequirement.TEST_ENVIRONMENT_READY: {
        "check": lambda: all([
            os.environ.get("BETA_TEST_ENV") == "true",
            os.environ.get("BETA_TEST_DB") is not None,
            os.environ.get("BETA_TEST_API_KEY") is not None
        ]),
        "error": "Test environment is not ready: missing required environment variables"
    },
    PreValidationRequirement.SYSTEM_DEPENDENCIES_READY: {
        "check": lambda: all([
            sys.version_info >= (3, 9),
            "psutil" in sys.modules,
            "aiohttp" in sys.modules,
            "sqlalchemy" in sys.modules,
            "alembic" in sys.modules,
            "pytest" in sys.modules
        ]),
        "error": "System dependencies are not ready: missing required Python packages"
    },
    PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY: {
        "check": lambda: all([
            Path(os.environ.get("BETA_DATA_DIR", "")).exists(),
            Path(os.environ.get("BETA_LOG_DIR", "")).exists(),
            Path(os.environ.get("BETA_BACKUP_DIR", "")).exists()
        ]),
        "error": "Filesystem dependencies are not ready: missing required directories"
    },
    PreValidationRequirement.CODE_DEPENDENCIES_READY: {
        "check": lambda: all([
            Path("requirements.txt").exists(),
            Path("alembic.ini").exists(),
            Path("pytest.ini").exists()
        ]),
        "error": "Code dependencies are not ready: missing required configuration files"
    },
    PreValidationRequirement.SYSTEM_RESOURCES_READY: {
        "check": lambda: all([
            psutil.virtual_memory().percent < 80,
            psutil.disk_usage("/").percent < 80,
            len(psutil.Process().connections()) < 1000
        ]),
        "error": "System resources are not ready: insufficient memory, disk space, or too many connections"
    },
    PreValidationRequirement.NETWORK_READY: {
        "check": lambda: all([
            os.environ.get("BETA_API_URL") is not None,
            os.environ.get("BETA_DB_URL") is not None,
            os.environ.get("BETA_METRICS_URL") is not None
        ]),
        "error": "Network is not ready: missing required URLs"
    },
    
    # Core Requirements
    PreValidationRequirement.DATABASE_READY: {
        "check": lambda: all([
            os.environ.get("BETA_DB_URL") is not None,
            sqlalchemy.create_engine(os.environ["BETA_DB_URL"]).connect() is not None
        ]),
        "error": "Database is not ready: cannot connect to database"
    },
    PreValidationRequirement.CONFIG_LOADED: {
        "check": lambda: all([
            os.environ.get("BETA_CONFIG_PATH") is not None,
            Path(os.environ["BETA_CONFIG_PATH"]).exists(),
            json.loads(Path(os.environ["BETA_CONFIG_PATH"]).read_text()) is not None
        ]),
        "error": "Config is not loaded: missing or invalid configuration file"
    },
    PreValidationRequirement.LOGGING_CONFIGURED: {
        "check": lambda: all([
            logging.getLogger().handlers,
            Path(os.environ.get("BETA_LOG_DIR", "")).exists(),
            Path(os.environ.get("BETA_LOG_DIR", "")).is_dir()
        ]),
        "error": "Logging is not configured: missing handlers or log directory"
    },
    PreValidationRequirement.CRITICAL_PATHS_DEFINED: {
        "check": lambda: all([
            os.environ.get("BETA_CRITICAL_PATHS") is not None,
            json.loads(os.environ["BETA_CRITICAL_PATHS"]) is not None
        ]),
        "error": "Critical paths are not defined: missing critical paths configuration"
    },
    PreValidationRequirement.SECURITY_INITIALIZED: {
        "check": lambda: all([
            os.environ.get("BETA_SECRET_KEY") is not None,
            os.environ.get("BETA_AUTH_TOKEN") is not None,
            os.environ.get("BETA_ENCRYPTION_KEY") is not None
        ]),
        "error": "Security is not initialized: missing required security keys"
    },
    PreValidationRequirement.MONITORING_READY: {
        "check": lambda: all([
            os.environ.get("BETA_MONITORING_URL") is not None,
            os.environ.get("BETA_MONITORING_KEY") is not None,
            requests.get(os.environ["BETA_MONITORING_URL"]).status_code == 200
        ]),
        "error": "Monitoring is not ready: cannot connect to monitoring service"
    },
    PreValidationRequirement.BACKUP_SYSTEM_READY: {
        "check": lambda: all([
            Path(os.environ.get("BETA_BACKUP_DIR", "")).exists(),
            Path(os.environ.get("BETA_BACKUP_DIR", "")).is_dir(),
            os.access(os.environ.get("BETA_BACKUP_DIR", ""), os.W_OK)
        ]),
        "error": "Backup system is not ready: missing or inaccessible backup directory"
    },
    PreValidationRequirement.NOTIFICATION_SYSTEM_READY: {
        "check": lambda: all([
            os.environ.get("BETA_NOTIFICATION_URL") is not None,
            os.environ.get("BETA_NOTIFICATION_KEY") is not None,
            requests.get(os.environ["BETA_NOTIFICATION_URL"]).status_code == 200
        ]),
        "error": "Notification system is not ready: cannot connect to notification service"
    },
    
    # Beta Requirements
    PreValidationRequirement.BETA_FEATURE_FLAGS_READY: {
        "check": lambda: all([
            os.environ.get("BETA_FEATURE_FLAGS") is not None,
            json.loads(os.environ["BETA_FEATURE_FLAGS"]) is not None
        ]),
        "error": "Beta feature flags are not ready: missing feature flags configuration"
    },
    PreValidationRequirement.BETA_USER_MANAGEMENT_READY: {
        "check": lambda: all([
            os.environ.get("BETA_USER_MGMT_URL") is not None,
            os.environ.get("BETA_USER_MGMT_KEY") is not None,
            requests.get(os.environ["BETA_USER_MGMT_URL"]).status_code == 200
        ]),
        "error": "Beta user management is not ready: cannot connect to user management service"
    },
    PreValidationRequirement.BETA_DATA_ISOLATION_READY: {
        "check": lambda: all([
            os.environ.get("BETA_DATA_ISOLATION") == "true",
            os.environ.get("BETA_DATA_PREFIX") is not None
        ]),
        "error": "Beta data isolation is not ready: missing isolation configuration"
    },
    PreValidationRequirement.BETA_MONITORING_READY: {
        "check": lambda: all([
            os.environ.get("BETA_MONITORING_URL") is not None,
            os.environ.get("BETA_MONITORING_KEY") is not None,
            requests.get(os.environ["BETA_MONITORING_URL"]).status_code == 200
        ]),
        "error": "Beta monitoring is not ready: cannot connect to monitoring service"
    },
    PreValidationRequirement.BETA_FEEDBACK_READY: {
        "check": lambda: all([
            os.environ.get("BETA_FEEDBACK_URL") is not None,
            os.environ.get("BETA_FEEDBACK_KEY") is not None,
            requests.get(os.environ["BETA_FEEDBACK_URL"]).status_code == 200
        ]),
        "error": "Beta feedback system is not ready: cannot connect to feedback service"
    },
    PreValidationRequirement.BETA_ROLLBACK_READY: {
        "check": lambda: all([
            Path(os.environ.get("BETA_ROLLBACK_DIR", "")).exists(),
            Path(os.environ.get("BETA_ROLLBACK_DIR", "")).is_dir(),
            os.access(os.environ.get("BETA_ROLLBACK_DIR", ""), os.W_OK)
        ]),
        "error": "Beta rollback system is not ready: missing or inaccessible rollback directory"
    },
    
    # Recovery Requirements
    PreValidationRequirement.ROLLBACK_PROCEDURES_READY: {
        "check": lambda: all([
            Path("rollback.sh").exists(),
            os.access("rollback.sh", os.X_OK)
        ]),
        "error": "Rollback procedures are not ready: missing or non-executable rollback script"
    },
    PreValidationRequirement.BACKUP_RESTORE_READY: {
        "check": lambda: all([
            Path("backup.sh").exists(),
            Path("restore.sh").exists(),
            os.access("backup.sh", os.X_OK),
            os.access("restore.sh", os.X_OK)
        ]),
        "error": "Backup/restore procedures are not ready: missing or non-executable scripts"
    },
    PreValidationRequirement.EMERGENCY_PROCEDURES_READY: {
        "check": lambda: all([
            Path("emergency.sh").exists(),
            os.access("emergency.sh", os.X_OK)
        ]),
        "error": "Emergency procedures are not ready: missing or non-executable emergency script"
    },
    
    # Validation Requirements
    PreValidationRequirement.VALIDATION_CHAIN_READY: {
        "check": lambda: all([
            Path("validation_chain.json").exists(),
            json.loads(Path("validation_chain.json").read_text()) is not None
        ]),
        "error": "Validation chain is not ready: missing or invalid validation chain configuration"
    },
    PreValidationRequirement.VALIDATION_EVIDENCE_READY: {
        "check": lambda: all([
            Path(os.environ.get("BETA_EVIDENCE_DIR", "")).exists(),
            Path(os.environ.get("BETA_EVIDENCE_DIR", "")).is_dir(),
            os.access(os.environ.get("BETA_EVIDENCE_DIR", ""), os.W_OK)
        ]),
        "error": "Validation evidence is not ready: missing or inaccessible evidence directory"
    },
    PreValidationRequirement.VALIDATION_METRICS_READY: {
        "check": lambda: all([
            os.environ.get("BETA_METRICS_URL") is not None,
            os.environ.get("BETA_METRICS_KEY") is not None,
            requests.get(os.environ["BETA_METRICS_URL"]).status_code == 200
        ]),
        "error": "Validation metrics are not ready: cannot connect to metrics service"
    },
    
    # Beta Launch Requirements
    PreValidationRequirement.BETA_LAUNCH_CHECKLIST_COMPLETE: {
        "check": lambda: all([
            Path("beta_checklist.json").exists(),
            json.loads(Path("beta_checklist.json").read_text())["complete"] == True
        ]),
        "error": "Beta launch checklist is not complete: missing or incomplete checklist"
    },
    PreValidationRequirement.BETA_ENVIRONMENT_READY: {
        "check": lambda: all([
            os.environ.get("BETA_ENV") == "true",
            os.environ.get("BETA_VERSION") is not None,
            os.environ.get("BETA_STAGE") is not None
        ]),
        "error": "Beta environment is not ready: missing required environment configuration"
    },
    PreValidationRequirement.BETA_SUPPORT_READY: {
        "check": lambda: all([
            os.environ.get("BETA_SUPPORT_URL") is not None,
            os.environ.get("BETA_SUPPORT_KEY") is not None,
            requests.get(os.environ["BETA_SUPPORT_URL"]).status_code == 200
        ]),
        "error": "Beta support system is not ready: cannot connect to support service"
    },
    PreValidationRequirement.BETA_METRICS_READY: {
        "check": lambda: all([
            os.environ.get("BETA_METRICS_URL") is not None,
            os.environ.get("BETA_METRICS_KEY") is not None,
            requests.get(os.environ["BETA_METRICS_URL"]).status_code == 200
        ]),
        "error": "Beta metrics system is not ready: cannot connect to metrics service"
    }
}
