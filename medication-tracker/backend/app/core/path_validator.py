"""
Path Validator
Critical Path: VALIDATION-PATH-*
Last Updated: 2025-01-02T12:49:23+01:00

Validates Python path configuration using validation hooks
"""

import logging
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

from .validation_hooks import ValidationHooks, ValidationStage, ValidationHookPriority, ValidationHook
from .validation_types import ValidationResult, ValidationStatus, ValidationLevel
from backend.app.exceptions import PathValidationError

logger = logging.getLogger(__name__)

class PathValidator:
    """Validates Python path configuration"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backend_path = project_root / "backend"
        self.required_paths = [
            self.project_root,
            self.backend_path
        ]
        self.required_modules = [
            "backend.app.core",
            "backend.app.middleware",
            "backend.app.exceptions"
        ]
        self.hooks = ValidationHooks.get_instance()
        
        # Register validation hooks
        self._register_validation_hooks()
        
    def _register_validation_hooks(self):
        """Register validation hooks for path validation"""
        # Path existence validation
        self.hooks.register_hook(ValidationHook(
            "path_existence",
            ValidationStage.PRE_VALIDATION,
            ValidationHookPriority.CRITICAL,
            self._validate_path_existence
        ))
        
        # Module import validation
        self.hooks.register_hook(ValidationHook(
            "module_imports",
            ValidationStage.VALIDATION,
            ValidationHookPriority.HIGH,
            self._validate_module_imports
        ))
        
    async def validate_paths(self) -> ValidationResult:
        """Validate Python path configuration"""
        try:
            # Run all validation hooks
            for stage in [ValidationStage.PRE_VALIDATION, ValidationStage.VALIDATION]:
                stage_result = await self.hooks.validate_stage(stage)
                if not stage_result["valid"]:
                    return ValidationResult(
                        valid=False,
                        level=ValidationLevel.ERROR,
                        status=ValidationStatus.FAILED,
                        message=f"Stage {stage.value} validation failed",
                        details=stage_result
                    )
                    
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Path validation successful",
                details={"stages": self.hooks.get_validation_state()}
            )
            
        except PathValidationError as e:
            logger.error(f"Path validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path validation failed: {str(e)}"
            )
            
        except Exception as e:
            logger.error(f"Path validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path validation failed: {str(e)}"
            )
            
    async def _validate_path_existence(self) -> ValidationResult:
        """Validate required paths exist"""
        try:
            missing_paths = []
            for path in self.required_paths:
                if not path.exists():
                    missing_paths.append(str(path))
                    
            if missing_paths:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Required paths missing",
                    details={"missing_paths": missing_paths}
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="All required paths exist"
            )
            
        except PathValidationError as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path existence validation error: {str(e)}"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path existence validation error: {str(e)}"
            )
            
    async def _validate_module_imports(self) -> ValidationResult:
        """Validate required modules can be imported"""
        try:
            missing_modules = []
            for module in self.required_modules:
                try:
                    __import__(module)
                except ImportError:
                    missing_modules.append(module)
                    
            if missing_modules:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Required modules cannot be imported",
                    details={"missing_modules": missing_modules}
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="All required modules can be imported"
            )
            
        except PathValidationError as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Module import validation error: {str(e)}"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Module import validation error: {str(e)}"
            )
            
    async def fix_paths(self) -> ValidationResult:
        """Fix Python path configuration"""
        try:
            # Validate first
            validation = await self.validate_paths()
            if validation.valid:
                return ValidationResult(
                    valid=True,
                    level=ValidationLevel.INFO,
                    status=ValidationStatus.PASSED,
                    message="No path fixes needed"
                )
                
            # Add project root to Python path if needed
            if str(self.project_root) not in sys.path:
                sys.path.insert(0, str(self.project_root))
                
            # Create missing directories
            for path in self.required_paths:
                path.mkdir(parents=True, exist_ok=True)
                
            # Revalidate after fixes
            revalidation = await self.validate_paths()
            if not revalidation.valid:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Path fixes failed",
                    details=revalidation.details
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Path fixes applied successfully"
            )
            
        except PathValidationError as e:
            logger.error(f"Path fix failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path fix failed: {str(e)}"
            )
            
        except Exception as e:
            logger.error(f"Path fix failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Path fix failed: {str(e)}"
            )
            
    @classmethod
    def create_validator(cls, project_root: Optional[Path] = None) -> 'PathValidator':
        """Factory method to create path validator"""
        if project_root is None:
            project_root = Path.cwd()
        return cls(project_root)
