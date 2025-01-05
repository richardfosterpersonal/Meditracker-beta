"""
Launch Plan Validator
Critical Path: LAUNCH-PLAN-VAL-*
Last Updated: 2025-01-02T10:36:10+01:00

Validates the entire launch plan before execution, ensuring all steps are viable.
"""

import logging
import importlib
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum, auto

logger = logging.getLogger(__name__)

class LaunchStage(Enum):
    """Stages of the launch process"""
    PYTHON_PATH_CONFIG = auto()
    IMPORT_RESOLUTION = auto()
    MODULE_AVAILABILITY = auto()
    CLASS_AVAILABILITY = auto()
    METHOD_AVAILABILITY = auto()
    DEPENDENCY_CHAIN = auto()
    RUNTIME_REQUIREMENTS = auto()
    DATABASE_ACCESS = auto()
    FILE_PERMISSIONS = auto()
    RESOURCE_AVAILABILITY = auto()

@dataclass
class LaunchStep:
    """A step in the launch plan"""
    stage: LaunchStage
    description: str
    validation_func: callable
    dependencies: List[LaunchStage]
    critical: bool = True
    
class LaunchPlanError(Exception):
    """Raised when launch plan validation fails"""
    pass

class LaunchPlanValidator:
    """Validates the entire launch plan before execution"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backend_path = project_root / "backend"
        self.launch_steps = self._define_launch_steps()
        
    def _define_launch_steps(self) -> List[LaunchStep]:
        """Define all steps in the launch plan"""
        return [
            LaunchStep(
                stage=LaunchStage.PYTHON_PATH_CONFIG,
                description="Validate Python path configuration",
                validation_func=self._validate_python_paths,
                dependencies=[],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.IMPORT_RESOLUTION,
                description="Validate import resolution",
                validation_func=self._validate_imports,
                dependencies=[LaunchStage.PYTHON_PATH_CONFIG],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.MODULE_AVAILABILITY,
                description="Validate required modules",
                validation_func=self._validate_modules,
                dependencies=[LaunchStage.IMPORT_RESOLUTION],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.CLASS_AVAILABILITY,
                description="Validate required classes",
                validation_func=self._validate_classes,
                dependencies=[LaunchStage.MODULE_AVAILABILITY],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.METHOD_AVAILABILITY,
                description="Validate required methods",
                validation_func=self._validate_methods,
                dependencies=[LaunchStage.CLASS_AVAILABILITY],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.DEPENDENCY_CHAIN,
                description="Validate dependency chain",
                validation_func=self._validate_dependency_chain,
                dependencies=[LaunchStage.METHOD_AVAILABILITY],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.RUNTIME_REQUIREMENTS,
                description="Validate runtime requirements",
                validation_func=self._validate_runtime_requirements,
                dependencies=[LaunchStage.DEPENDENCY_CHAIN],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.DATABASE_ACCESS,
                description="Validate database access",
                validation_func=self._validate_database_access,
                dependencies=[LaunchStage.RUNTIME_REQUIREMENTS],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.FILE_PERMISSIONS,
                description="Validate file permissions",
                validation_func=self._validate_file_permissions,
                dependencies=[LaunchStage.RUNTIME_REQUIREMENTS],
                critical=True
            ),
            LaunchStep(
                stage=LaunchStage.RESOURCE_AVAILABILITY,
                description="Validate resource availability",
                validation_func=self._validate_resource_availability,
                dependencies=[LaunchStage.RUNTIME_REQUIREMENTS],
                critical=True
            )
        ]
        
    def _validate_python_paths(self) -> Dict[str, Any]:
        """Validate Python path configuration"""
        from .path_validator import PathValidator
        return PathValidator(self.project_root).validate_paths()
        
    def _validate_imports(self) -> Dict[str, Any]:
        """Validate import resolution"""
        from .import_validator import ImportValidator
        return ImportValidator(self.project_root).validate_imports()
        
    def _validate_modules(self) -> Dict[str, Any]:
        """Validate required modules"""
        required_modules = [
            "backend.app.core.beta_launch_manager",
            "backend.app.core.validation_hooks",
            "backend.app.core.debug_validation",
            "backend.app.core.conversation_enforcer",
            "backend.app.core.import_validator",
            "backend.app.core.path_validator"
        ]
        
        results = {
            "valid": True,
            "errors": [],
            "available_modules": []
        }
        
        for module in required_modules:
            try:
                importlib.import_module(module)
                results["available_modules"].append(module)
            except ImportError as e:
                results["valid"] = False
                results["errors"].append(f"Cannot import {module}: {str(e)}")
                
        return results
        
    def _validate_classes(self) -> Dict[str, Any]:
        """Validate required classes"""
        required_classes = [
            ("backend.app.core.beta_launch_manager", ["BetaLaunchManager"]),
            ("backend.app.core.validation_hooks", ["ValidationHooks"]),
            ("backend.app.core.debug_validation", ["DebugValidator"]),
            ("backend.app.core.conversation_enforcer", ["ConversationEnforcer"]),
            ("backend.app.core.import_validator", ["ImportValidator"]),
            ("backend.app.core.path_validator", ["PathValidator"])
        ]
        
        results = {
            "valid": True,
            "errors": [],
            "available_classes": []
        }
        
        for module_name, classes in required_classes:
            try:
                module = importlib.import_module(module_name)
                for class_name in classes:
                    if hasattr(module, class_name):
                        results["available_classes"].append(f"{module_name}.{class_name}")
                    else:
                        results["valid"] = False
                        results["errors"].append(f"Class {class_name} not found in {module_name}")
            except ImportError as e:
                results["valid"] = False
                results["errors"].append(f"Cannot import {module_name}: {str(e)}")
                
        return results
        
    def _validate_methods(self) -> Dict[str, Any]:
        """Validate required methods"""
        required_methods = [
            ("backend.app.core.beta_launch_manager.BetaLaunchManager", [
                "create_launch_manager", "prepare_launch", "validate_environment",
                "validate_resources", "validate_metrics", "launch"
            ])
        ]
        
        results = {
            "valid": True,
            "errors": [],
            "available_methods": []
        }
        
        for class_path, methods in required_methods:
            try:
                module_path, class_name = class_path.rsplit(".", 1)
                module = importlib.import_module(module_path)
                class_obj = getattr(module, class_name)
                
                for method_name in methods:
                    if hasattr(class_obj, method_name):
                        results["available_methods"].append(f"{class_path}.{method_name}")
                    else:
                        results["valid"] = False
                        results["errors"].append(f"Method {method_name} not found in {class_path}")
            except ImportError as e:
                results["valid"] = False
                results["errors"].append(f"Cannot import {module_path}: {str(e)}")
                
        return results
        
    def _validate_dependency_chain(self) -> Dict[str, Any]:
        """Validate dependency chain"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check for circular dependencies
        visited = set()
        path = []
        
        def visit_step(step: LaunchStep):
            if step.stage in path:
                cycle = " -> ".join(s.name for s in path[path.index(step.stage):])
                results["valid"] = False
                results["errors"].append(f"Circular dependency detected: {cycle}")
                return
                
            if step.stage in visited:
                return
                
            visited.add(step.stage)
            path.append(step.stage)
            
            for dep_stage in step.dependencies:
                dep_step = next((s for s in self.launch_steps if s.stage == dep_stage), None)
                if dep_step:
                    visit_step(dep_step)
                else:
                    results["valid"] = False
                    results["errors"].append(f"Missing dependency: {dep_stage}")
                    
            path.pop()
            
        for step in self.launch_steps:
            visit_step(step)
            
        return results
        
    def _validate_runtime_requirements(self) -> Dict[str, Any]:
        """Validate runtime requirements"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check Python version
        import sys
        required_version = (3, 8)
        if sys.version_info[:2] < required_version:
            results["valid"] = False
            results["errors"].append(
                f"Python version {'.'.join(map(str, required_version))} or higher required"
            )
            
        # Check virtual environment
        if not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            results["warnings"].append("Not running in a virtual environment")
            
        return results
        
    def _validate_database_access(self) -> Dict[str, Any]:
        """Validate database access"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        try:
            from backend.app.models import db
            if not db.engine.dialect.has_table(db.engine, 'beta_validation'):
                results["warnings"].append("Beta validation table not found")
        except Exception as e:
            results["valid"] = False
            results["errors"].append(f"Database access failed: {str(e)}")
            
        return results
        
    def _validate_file_permissions(self) -> Dict[str, Any]:
        """Validate file permissions"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        required_paths = [
            self.project_root / "logs",
            self.project_root / "data",
            self.backend_path / "app" / "core"
        ]
        
        for path in required_paths:
            if not path.exists():
                results["valid"] = False
                results["errors"].append(f"Required path does not exist: {path}")
            elif not os.access(path, os.R_OK | os.W_OK):
                results["valid"] = False
                results["errors"].append(f"Insufficient permissions for: {path}")
                
        return results
        
    def _validate_resource_availability(self) -> Dict[str, Any]:
        """Validate resource availability"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check memory
        import psutil
        memory = psutil.virtual_memory()
        if memory.available < 1 * 1024 * 1024 * 1024:  # 1GB
            results["warnings"].append("Less than 1GB memory available")
            
        # Check disk space
        disk = psutil.disk_usage(str(self.project_root))
        if disk.free < 5 * 1024 * 1024 * 1024:  # 5GB
            results["warnings"].append("Less than 5GB disk space available")
            
        return results
        
    def validate_launch_plan(self) -> Dict[str, Any]:
        """Validate the entire launch plan"""
        results = {
            "valid": True,
            "stages": {},
            "errors": [],
            "warnings": []
        }
        
        # Validate each step in order
        for step in self.launch_steps:
            logger.info(f"Validating {step.description}...")
            
            # Check dependencies first
            for dep_stage in step.dependencies:
                if dep_stage not in results["stages"] or not results["stages"][dep_stage]["valid"]:
                    results["valid"] = False
                    results["errors"].append(
                        f"Cannot validate {step.stage.name}: "
                        f"dependency {dep_stage.name} not validated"
                    )
                    continue
                    
            # Run validation
            try:
                step_results = step.validation_func()
                results["stages"][step.stage] = step_results
                
                if not step_results["valid"] and step.critical:
                    results["valid"] = False
                    results["errors"].extend(
                        f"{step.stage.name}: {error}"
                        for error in step_results.get("errors", [])
                    )
                    
                results["warnings"].extend(
                    f"{step.stage.name}: {warning}"
                    for warning in step_results.get("warnings", [])
                )
                
            except Exception as e:
                results["valid"] = False
                results["errors"].append(
                    f"Error validating {step.stage.name}: {str(e)}"
                )
                
            if not results["valid"] and step.critical:
                break
                
        return results
        
    @classmethod
    def create_validator(cls, project_root: Optional[Path] = None) -> 'LaunchPlanValidator':
        """Factory method to create launch plan validator"""
        if project_root is None:
            current_file = Path(__file__)
            project_root = current_file.parent.parent.parent.parent
            
        return cls(project_root)
