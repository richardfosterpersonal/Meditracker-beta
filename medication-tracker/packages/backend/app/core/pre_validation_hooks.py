"""
Pre-validation hooks for beta testing
Critical Path: VALIDATION-PRE-HOOKS-*
Last Updated: 2025-01-01T21:37:15+01:00
"""

import asyncio
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
import importlib
import sys
import yaml
from typing import Any, Callable, Dict, List, Optional, Set

from .pre_validation_requirements import (
    PreValidationRequirement,
    PreValidationManager,
    PreValidationError
)

class PreValidationHook:
    """Pre-validation hook for beta testing"""
    
    def __init__(self, requirement: PreValidationRequirement):
        self.requirement = requirement
        self.timestamp = datetime.utcnow().isoformat()
        
    async def __call__(self, *args, **kwargs) -> bool:
        """Execute the hook"""
        raise NotImplementedError

class SystemDependenciesHook(PreValidationHook):
    """Validates system-level dependencies"""
    
    def __init__(self):
        super().__init__(PreValidationRequirement.SYSTEM_DEPENDENCIES_READY)
        self.logger = logging.getLogger(__name__)
        
    async def __call__(self, *args, **kwargs) -> bool:
        try:
            self.logger.info("Validating system dependencies...")
            
            # Check Python version
            required_version = (3, 8)
            current_version = sys.version_info[:2]
            if current_version < required_version:
                raise PreValidationError(
                    f"Python {required_version[0]}.{required_version[1]} or higher required"
                )
                
            # Check required system packages
            required_packages = ["yaml", "asyncio", "pathlib", "typing"]
            for package in required_packages:
                try:
                    importlib.import_module(package)
                except ImportError as e:
                    raise PreValidationError(f"Required package missing: {package}")
                    
            return True
            
        except Exception as e:
            self.logger.error(f"System dependencies check failed: {str(e)}")
            raise

class FileSystemDependenciesHook(PreValidationHook):
    """Validates file system dependencies"""
    
    def __init__(self):
        super().__init__(PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY)
        self.logger = logging.getLogger(__name__)
        
    async def __call__(self, *args, **kwargs) -> bool:
        try:
            self.logger.info("Validating file system dependencies...")
            
            # Required directories
            required_dirs = [
                "backend/app/core",
                "backend/app/validation",
                "backend/app/infrastructure",
                "backend/app/middleware",
                "docs",
                "frontend"
            ]
            
            # Required files with validation functions
            required_files = {
                "docs/architecture.yaml": self._validate_architecture_yaml,
                "docs/critical_paths.yaml": self._validate_critical_paths_yaml,
                "backend/app/exceptions.py": None,
                ".env": self._validate_env_file
            }
            
            # Check directories
            for dir_path in required_dirs:
                full_path = Path(dir_path)
                if not full_path.exists() or not full_path.is_dir():
                    raise PreValidationError(f"Required directory missing: {dir_path}")
                    
            # Check files and validate content if needed
            for file_path, validator in required_files.items():
                full_path = Path(file_path)
                if not full_path.exists() or not full_path.is_file():
                    raise PreValidationError(f"Required file missing: {file_path}")
                if validator:
                    validator(full_path)
                    
            return True
            
        except Exception as e:
            self.logger.error(f"File system dependencies check failed: {str(e)}")
            raise
            
    def _validate_architecture_yaml(self, path: Path) -> None:
        """Validate architecture.yaml structure"""
        try:
            with open(path) as f:
                data = yaml.safe_load(f)
                required_keys = ["components", "interfaces", "critical_paths"]
                for key in required_keys:
                    if key not in data:
                        raise PreValidationError(
                            f"Missing required key in architecture.yaml: {key}"
                        )
        except Exception as e:
            raise PreValidationError(f"Invalid architecture.yaml: {str(e)}")
            
    def _validate_critical_paths_yaml(self, path: Path) -> None:
        """Validate critical_paths.yaml structure"""
        try:
            with open(path) as f:
                data = yaml.safe_load(f)
                if not isinstance(data, dict):
                    raise PreValidationError("Invalid critical_paths.yaml format")
        except Exception as e:
            raise PreValidationError(f"Invalid critical_paths.yaml: {str(e)}")
            
    def _validate_env_file(self, path: Path) -> None:
        """Validate .env file has required variables"""
        required_vars = [
            "BETA_MODE",
            "BETA_ACCESS_KEY",
            "VALIDATION_INTERVAL",
            "BACKUP_INTERVAL"
        ]
        with open(path) as f:
            content = f.read()
            for var in required_vars:
                if var not in content:
                    raise PreValidationError(f"Missing required env variable: {var}")

class CodeDependenciesReadyHook(PreValidationHook):
    """Validates all required code dependencies are present"""
    
    def __init__(self):
        super().__init__(PreValidationRequirement.CODE_DEPENDENCIES_READY)
        self.logger = logging.getLogger(__name__)
        
    async def __call__(self, *args, **kwargs) -> bool:
        try:
            self.logger.info("Starting comprehensive code dependency validation")
            
            # 1. Required Exception Classes
            self.logger.info("Validating exception classes...")
            required_exceptions = [
                "AppError",
                "ValidationError",
                "ConfigurationError",
                "NotificationError",
                "DocumentationError",
                "PreValidationError",
                "ArchitectureError",
                "VersionError",
                "DependencyError"
            ]
            
            # Import and verify exceptions
            from app.exceptions import (
                AppError,
                ValidationError,
                ConfigurationError,
                NotificationError,
                DocumentationError,
                ArchitectureError,
                VersionError,
                DependencyError
            )
            
            # 2. Required Classes
            self.logger.info("Validating required classes...")
            required_classes = {
                "app.core.hooks.validation_hooks.ValidationEvent": ["ValidationEvent"],
                "app.infrastructure.notification.notification_handler.NotificationHandler": ["NotificationHandler"],
                "app.core.documentation.doc_validator.DocumentationValidator": ["DocumentationValidator"],
                "app.core.versioning.version_validator.VersionValidator": ["VersionValidator"]
            }
            
            for module_path, classes in required_classes.items():
                module = importlib.import_module(module_path)
                for class_name in classes:
                    if not hasattr(module, class_name):
                        raise PreValidationError(
                            f"Required class not found: {class_name} in {module_path}"
                        )
            
            # 3. Core Framework Modules
            self.logger.info("Validating core framework modules...")
            core_framework_modules = [
                "app.core.beta_initializer",
                "app.core.validation_orchestrator",
                "app.core.beta_validation_orchestrator",
                "app.core.validation_chain",
                "app.core.enforcer_decorators",
                "app.core.evidence_collector",
                "app.core.validation_hooks"
            ]
            
            # 4. Validation Modules
            self.logger.info("Validating validation modules...")
            validation_modules = [
                "app.validation.final_validation_suite",
                "app.validation.core",
                "app.validation.beta_validation_tracker",
                "app.validation.medication_safety"
            ]
            
            # 5. Core Feature Modules
            self.logger.info("Validating core feature modules...")
            feature_modules = [
                "app.core.versioning.version_validator",
                "app.core.documentation.doc_validator",
                "app.core.unified_validation_framework",
                "app.middleware.validation_middleware"
            ]
            
            # 6. Infrastructure Modules
            self.logger.info("Validating infrastructure modules...")
            infrastructure_modules = [
                "app.infrastructure.notification.push_sender",
                "app.infrastructure.database.connection",
                "app.infrastructure.security.validator"
            ]
            
            # Combine all required modules
            all_required_modules = (
                core_framework_modules +
                validation_modules +
                feature_modules +
                infrastructure_modules
            )
            
            # Attempt to import each module
            for module in all_required_modules:
                try:
                    self.logger.debug(f"Importing module: {module}")
                    importlib.import_module(module)
                except ImportError as e:
                    self.logger.error(f"Failed to import {module}: {str(e)}")
                    raise PreValidationError(f"Missing required module: {module}")
                except Exception as e:
                    self.logger.error(f"Error importing {module}: {str(e)}")
                    raise PreValidationError(f"Error in module {module}: {str(e)}")
            
            self.logger.info("All code dependencies validated successfully")
            return True
            
        except ImportError as e:
            self.logger.error(f"Missing code dependency: {str(e)}")
            raise PreValidationError(f"Missing code dependency: {str(e)}")
        except Exception as e:
            self.logger.error(f"Code dependencies check failed: {str(e)}")
            raise PreValidationError(f"Code dependencies check failed: {str(e)}")

class TestEnvironmentHook(PreValidationHook):
    """Validates test environment readiness"""
    
    def __init__(self):
        super().__init__(PreValidationRequirement.TEST_ENVIRONMENT_READY)
        self.logger = logging.getLogger(__name__)
        
    async def __call__(self, *args, **kwargs) -> bool:
        try:
            from app.tests.test_environment import TestEnvironmentValidator
            validator = TestEnvironmentValidator()
            
            self.logger.info("Validating test environment...")
            if not validator.validate_all():
                raise PreValidationError("Test environment validation failed")
                
            return True
            
        except Exception as e:
            self.logger.error(f"Test environment validation failed: {str(e)}")
            raise PreValidationError(f"Test environment validation failed: {str(e)}")

class ValidationCorrection:
    """Base class for validation corrections"""
    def __init__(self, requirement: PreValidationRequirement):
        self.requirement = requirement
        self.logger = logging.getLogger(__name__)
        
    async def can_correct(self, error: Exception) -> bool:
        """Check if this correction can handle the error"""
        raise NotImplementedError
        
    async def pre_validate_correction(self, error: Exception) -> bool:
        """Validate that the correction is safe to apply"""
        raise NotImplementedError
        
    async def correct(self, error: Exception) -> bool:
        """Attempt to correct the validation failure"""
        raise NotImplementedError
        
    async def verify_correction(self) -> bool:
        """Verify that the correction was successful"""
        raise NotImplementedError
        
    async def rollback_correction(self) -> None:
        """Rollback the correction if verification fails"""
        raise NotImplementedError

class SystemDependencyCorrection(ValidationCorrection):
    """Corrects system dependency issues"""
    
    async def can_correct(self, error: Exception) -> bool:
        return isinstance(error, (ImportError, ModuleNotFoundError))
        
    async def pre_validate_correction(self, error: Exception) -> bool:
        try:
            if isinstance(error, ImportError):
                missing_package = str(error).split("'")[1]
                
                # Check if package exists in PyPI
                process = await asyncio.create_subprocess_exec(
                    sys.executable, "-m", "pip", "search", missing_package,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                
                # Check package safety (you'd want to integrate with a package safety database)
                is_safe = await self._check_package_safety(missing_package)
                
                # Check if we have permission to install packages
                pip_location = os.path.dirname(sys.executable)
                has_permission = os.access(pip_location, os.W_OK)
                
                return process.returncode == 0 and is_safe and has_permission
                
        except Exception as e:
            self.logger.error(f"Pre-validation failed: {str(e)}")
            return False
            
    async def _check_package_safety(self, package: str) -> bool:
        # This would integrate with a package safety database
        # For now, we'll use a whitelist approach
        safe_packages = {
            "yaml", "asyncio", "aiohttp", "pytest", "typing",
            "pathlib", "logging", "datetime", "typing-extensions"
        }
        return package.lower() in safe_packages
        
    async def correct(self, error: Exception) -> bool:
        if not await self.pre_validate_correction(error):
            self.logger.error("Pre-validation failed, cannot proceed with correction")
            return False
            
        try:
            if isinstance(error, ImportError):
                missing_package = str(error).split("'")[1]
                self.logger.info(f"Attempting to install missing package: {missing_package}")
                
                # Store original state for rollback
                self._original_state = await self._get_package_state(missing_package)
                
                # Use pip to install the package
                process = await asyncio.create_subprocess_exec(
                    sys.executable, "-m", "pip", "install", missing_package,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                if process.returncode != 0:
                    self.logger.error(f"Failed to install {missing_package}: {stderr.decode()}")
                    return False
                return True
        except Exception as e:
            self.logger.error(f"Correction failed: {str(e)}")
            return False
            
    async def _get_package_state(self, package: str) -> Dict[str, Any]:
        try:
            process = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "pip", "show", package,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            return {
                "installed": process.returncode == 0,
                "info": stdout.decode() if process.returncode == 0 else None
            }
        except Exception:
            return {"installed": False, "info": None}
            
    async def verify_correction(self) -> bool:
        # Re-run the system dependencies hook
        hook = SystemDependenciesHook()
        try:
            return await hook()
        except Exception:
            await self.rollback_correction()
            return False
            
    async def rollback_correction(self) -> None:
        if hasattr(self, '_original_state'):
            if not self._original_state["installed"]:
                # Uninstall the package if it wasn't installed before
                try:
                    missing_package = str(error).split("'")[1]
                    process = await asyncio.create_subprocess_exec(
                        sys.executable, "-m", "pip", "uninstall", "-y", missing_package,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    await process.communicate()
                except Exception as e:
                    self.logger.error(f"Rollback failed: {str(e)}")

class TestEnvironmentCorrection(ValidationCorrection):
    """Corrects test environment issues"""
    
    def __init__(self, requirement: PreValidationRequirement):
        super().__init__(requirement)
        self._original_state = {}
        
    async def can_correct(self, error: Exception) -> bool:
        return isinstance(error, PreValidationError)
        
    async def pre_validate_correction(self, error: Exception) -> bool:
        try:
            from app.tests.test_environment import TestEnvironmentValidator
            validator = TestEnvironmentValidator()
            
            # Store current state for potential rollback
            self._original_state = {
                "packages": self._get_installed_packages(),
                "paths": self._get_existing_paths()
            }
            
            # Check if we have permission to install packages
            pip_location = os.path.dirname(sys.executable)
            has_permission = os.access(pip_location, os.W_OK)
            
            return has_permission
            
        except Exception as e:
            self.logger.error(f"Pre-validation failed: {str(e)}")
            return False
            
    def _get_installed_packages(self) -> Dict[str, str]:
        """Get currently installed packages and versions"""
        import pkg_resources
        return {pkg.key: pkg.version for pkg in pkg_resources.working_set}
        
    def _get_existing_paths(self) -> Set[str]:
        """Get existing paths"""
        from app.tests.test_environment import TestEnvironmentValidator
        validator = TestEnvironmentValidator()
        return {str(path) for path in validator.required_paths if path.exists()}
        
    async def correct(self, error: Exception) -> bool:
        if not await self.pre_validate_correction(error):
            self.logger.error("Pre-validation failed, cannot proceed with correction")
            return False
            
        try:
            from app.tests.test_environment import TestEnvironmentValidator
            validator = TestEnvironmentValidator()
            
            # Generate requirements file
            validator.generate_requirements_file()
            
            # Install required packages
            process = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "pip", "install", "-r", "test_requirements.txt",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                self.logger.error(f"Failed to install requirements: {stderr.decode()}")
                return False
                
            # Create required paths
            for path in validator.required_paths:
                if not path.exists():
                    if path.suffix:
                        path.parent.mkdir(parents=True, exist_ok=True)
                        path.touch()
                    else:
                        path.mkdir(parents=True, exist_ok=True)
                        
            return True
            
        except Exception as e:
            self.logger.error(f"Correction failed: {str(e)}")
            return False
            
    async def verify_correction(self) -> bool:
        try:
            from app.tests.test_environment import TestEnvironmentValidator
            validator = TestEnvironmentValidator()
            return validator.validate_all()
        except Exception:
            return False
            
    async def rollback_correction(self) -> None:
        try:
            # Uninstall packages that weren't originally installed
            current_packages = self._get_installed_packages()
            for package, version in current_packages.items():
                if package not in self._original_state["packages"]:
                    try:
                        process = await asyncio.create_subprocess_exec(
                            sys.executable, "-m", "pip", "uninstall", "-y", package,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        await process.communicate()
                    except Exception as e:
                        self.logger.error(f"Failed to uninstall {package}: {str(e)}")
                        
            # Remove paths that didn't exist originally
            current_paths = self._get_existing_paths()
            for path in current_paths:
                if path not in self._original_state["paths"]:
                    try:
                        path_obj = Path(path)
                        if path_obj.is_file():
                            path_obj.unlink()
                        else:
                            shutil.rmtree(path_obj)
                    except Exception as e:
                        self.logger.error(f"Failed to remove {path}: {str(e)}")
                        
        except Exception as e:
            self.logger.error(f"Rollback failed: {str(e)}")

class FileSystemCorrection(ValidationCorrection):
    """Corrects filesystem issues"""
    
    def __init__(self, requirement: PreValidationRequirement):
        super().__init__(requirement)
        self._backup_files = {}
        
    async def can_correct(self, error: Exception) -> bool:
        return isinstance(error, (FileNotFoundError, PermissionError))
        
    async def pre_validate_correction(self, error: Exception) -> bool:
        try:
            if isinstance(error, FileNotFoundError):
                path = Path(str(error).split("'")[1])
                
                # Check if we have write permission to parent directory
                if not os.access(path.parent, os.W_OK):
                    return False
                    
                # Check if we have enough disk space (1MB buffer)
                free_space = shutil.disk_usage(path.parent).free
                if free_space < 1024 * 1024:  # 1MB
                    return False
                    
                # For YAML files, validate the default structure
                if path.suffix == ".yaml":
                    return await self._validate_yaml_structure(path)
                    
                return True
                
            elif isinstance(error, PermissionError):
                path = Path(str(error).split("'")[1])
                return os.access(path.parent, os.W_OK)
                
        except Exception as e:
            self.logger.error(f"Pre-validation failed: {str(e)}")
            return False
            
    async def _validate_yaml_structure(self, path: Path) -> bool:
        try:
            content = self._get_default_yaml_content(path.name)
            # Validate the structure matches our schema
            if path.name == "architecture.yaml":
                required_keys = ["components", "interfaces", "critical_paths"]
                return all(key in content for key in required_keys)
            elif path.name == "critical_paths.yaml":
                return "paths" in content
            return True
        except Exception:
            return False
            
    def _get_default_yaml_content(self, filename: str) -> Dict:
        if filename == "architecture.yaml":
            return {
                "components": [],
                "interfaces": [],
                "critical_paths": []
            }
        elif filename == "critical_paths.yaml":
            return {
                "paths": {}
            }
        return {}
        
    async def correct(self, error: Exception) -> bool:
        if not await self.pre_validate_correction(error):
            self.logger.error("Pre-validation failed, cannot proceed with correction")
            return False
            
        try:
            if isinstance(error, FileNotFoundError):
                path = Path(str(error).split("'")[1])
                
                # Create parent directories if needed
                if not path.parent.exists():
                    self.logger.info(f"Creating directory: {path.parent}")
                    path.parent.mkdir(parents=True)
                    
                # For YAML files, create with default content
                if path.suffix == ".yaml":
                    self.logger.info(f"Creating default YAML file: {path}")
                    content = self._get_default_yaml_content(path.name)
                    with open(path, "w") as f:
                        yaml.dump(content, f)
                else:
                    # Create empty file for other types
                    path.touch()
                    
                return True
                
            elif isinstance(error, PermissionError):
                path = Path(str(error).split("'")[1])
                
                # Backup original permissions
                self._backup_files[path] = os.stat(path).st_mode
                
                self.logger.info(f"Fixing permissions for: {path}")
                os.chmod(path, 0o644)
                return True
                
        except Exception as e:
            self.logger.error(f"Correction failed: {str(e)}")
            await self.rollback_correction()
            return False
            
    async def verify_correction(self) -> bool:
        hook = FileSystemDependenciesHook()
        try:
            return await hook()
        except Exception:
            await self.rollback_correction()
            return False
            
    async def rollback_correction(self) -> None:
        try:
            # Restore original permissions
            for path, mode in self._backup_files.items():
                try:
                    os.chmod(path, mode)
                except Exception as e:
                    self.logger.error(f"Failed to restore permissions for {path}: {str(e)}")
                    
            self._backup_files.clear()
        except Exception as e:
            self.logger.error(f"Rollback failed: {str(e)}")

class PreValidationHookManager:
    """Manages pre-validation hooks"""
    
    def __init__(self):
        self.hooks: Dict[PreValidationRequirement, PreValidationHook] = {
            PreValidationRequirement.TEST_ENVIRONMENT_READY: TestEnvironmentHook(),
            PreValidationRequirement.SYSTEM_DEPENDENCIES_READY: SystemDependenciesHook(),
            PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY: FileSystemDependenciesHook(),
            PreValidationRequirement.CODE_DEPENDENCIES_READY: CodeDependenciesReadyHook(),
            PreValidationRequirement.DATABASE_READY: DatabaseReadyHook(),
            PreValidationRequirement.CONFIG_LOADED: ConfigLoadedHook(),
            PreValidationRequirement.LOGGING_CONFIGURED: LoggingConfiguredHook(),
            PreValidationRequirement.CRITICAL_PATHS_DEFINED: CriticalPathsDefinedHook(),
            PreValidationRequirement.SECURITY_INITIALIZED: SecurityInitializedHook(),
            PreValidationRequirement.MONITORING_READY: MonitoringReadyHook(),
            PreValidationRequirement.BACKUP_SYSTEM_READY: BackupSystemReadyHook(),
            PreValidationRequirement.NOTIFICATION_SYSTEM_READY: NotificationSystemReadyHook()
        }
        
        # Initialize correction handlers
        self.corrections: Dict[PreValidationRequirement, List[ValidationCorrection]] = {
            PreValidationRequirement.TEST_ENVIRONMENT_READY: [TestEnvironmentCorrection(PreValidationRequirement.TEST_ENVIRONMENT_READY)],
            PreValidationRequirement.SYSTEM_DEPENDENCIES_READY: [SystemDependencyCorrection(PreValidationRequirement.SYSTEM_DEPENDENCIES_READY)],
            PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY: [FileSystemCorrection(PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY)]
        }
        
        self.logger = logging.getLogger(__name__)
        self._register_with_validation_system()
        
    async def _attempt_correction(self, requirement: PreValidationRequirement, error: Exception) -> bool:
        """Attempt to correct a validation failure"""
        if requirement not in self.corrections:
            return False
            
        for correction in self.corrections[requirement]:
            try:
                if await correction.can_correct(error):
                    # Pre-validate the correction
                    if not await correction.pre_validate_correction(error):
                        self.logger.warning(f"Pre-validation failed for {requirement} correction")
                        continue
                        
                    self.logger.info(f"Attempting correction for {requirement}")
                    if await correction.correct(error):
                        if await correction.verify_correction():
                            self.logger.info(f"Successfully corrected {requirement}")
                            return True
                        else:
                            self.logger.warning(f"Correction verification failed for {requirement}")
                            await correction.rollback_correction()
            except Exception as e:
                self.logger.error(f"Correction attempt failed: {str(e)}")
                await correction.rollback_correction()
                
        return False

    async def run_hook(self, requirement: PreValidationRequirement) -> bool:
        """Run a specific hook with correction attempts"""
        if requirement not in self.hooks:
            raise PreValidationError(f"No hook found for requirement: {requirement}")
            
        hook = self.hooks[requirement]
        try:
            return await hook()
        except Exception as e:
            self.logger.error(f"Hook failed for {requirement}: {str(e)}")
            
            # Attempt correction
            if await self._attempt_correction(requirement, e):
                # Retry the hook after correction
                try:
                    return await hook()
                except Exception as retry_e:
                    self.logger.error(f"Hook still failed after correction: {str(retry_e)}")
                    
            raise
            
    async def run_all_hooks(self) -> Dict[PreValidationRequirement, bool]:
        """Run all hooks in the correct order with correction attempts"""
        results = {}
        
        hook_order = [
            PreValidationRequirement.TEST_ENVIRONMENT_READY,
            PreValidationRequirement.SYSTEM_DEPENDENCIES_READY,
            PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY,
            PreValidationRequirement.CODE_DEPENDENCIES_READY,
            PreValidationRequirement.CONFIG_LOADED,
            PreValidationRequirement.LOGGING_CONFIGURED,
            PreValidationRequirement.DATABASE_READY,
            PreValidationRequirement.CRITICAL_PATHS_DEFINED,
            PreValidationRequirement.SECURITY_INITIALIZED,
            PreValidationRequirement.MONITORING_READY,
            PreValidationRequirement.BACKUP_SYSTEM_READY,
            PreValidationRequirement.NOTIFICATION_SYSTEM_READY
        ]
        
        for requirement in hook_order:
            self.logger.info(f"Running {requirement.value} hook...")
            try:
                results[requirement] = await self.run_hook(requirement)
                if not results[requirement]:
                    break
            except Exception as e:
                self.logger.error(f"Validation failed for {requirement}: {str(e)}")
                results[requirement] = False
                break
                
        return results

# Create singleton instance
pre_validation_manager = PreValidationHookManager()
