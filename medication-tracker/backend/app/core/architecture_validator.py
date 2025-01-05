"""
Architecture Validator
Critical Path: ARCH-VAL-*
Last Updated: 2025-01-02T10:56:29+01:00

Validates code architecture and interfaces using configuration-driven rules.
"""

import ast
import logging
import importlib
import inspect
from pathlib import Path
from typing import Dict, Any, List, Set, Optional, Type
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ArchitectureValidationType(Enum):
    """Types of architecture validation"""
    CLASS_INTERFACE = "class_interface"
    INHERITANCE = "inheritance"
    DEPENDENCY = "dependency"
    API_COMPATIBILITY = "api_compatibility"
    FRAMEWORK_CONSISTENCY = "framework_consistency"

@dataclass
class ClassInterfaceRule:
    """Rule for validating class interfaces"""
    class_name: str
    required_methods: Set[str]
    required_attributes: Set[str]
    allowed_base_classes: Optional[Set[str]] = None
    required_method_signatures: Optional[Dict[str, inspect.Signature]] = None
    framework_requirements: Optional[Dict[str, Any]] = None

@dataclass
class ArchitectureRule:
    """Rule for validating architecture"""
    rule_type: ArchitectureValidationType
    target: str  # Class name, module name, or pattern
    requirements: Dict[str, Any]
    error_message: str
    fix_suggestion: Optional[str] = None
    priority: str = "high"

class ArchitectureValidator:
    """Validates code architecture using configuration-driven rules"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self._load_architecture_rules()
        
    def _load_architecture_rules(self) -> None:
        """Load architecture validation rules from configuration"""
        # Default rules for core framework components
        self.rules: List[ArchitectureRule] = []
        
        # Load ValidationHook interface rules
        self.rules.append(ArchitectureRule(
            rule_type=ArchitectureValidationType.CLASS_INTERFACE,
            target="ValidationHook",
            requirements={
                "methods": {"validate", "__str__", "__repr__"},
                "attributes": {"name", "stage", "priority", "dependencies"},
                "base_classes": set(),
                "method_signatures": {
                    "validate": inspect.Signature([
                        inspect.Parameter("self", inspect.Parameter.POSITIONAL_OR_KEYWORD)
                    ])
                }
            },
            error_message="ValidationHook interface requirements not met",
            fix_suggestion="Implement all required methods and attributes"
        ))
        
        # Load framework consistency rules
        self.rules.append(ArchitectureRule(
            rule_type=ArchitectureValidationType.FRAMEWORK_CONSISTENCY,
            target="validation_hooks",
            requirements={
                "deprecated_imports": {"HookCompetencyLevel"},
                "required_imports": {"ValidationHookPriority", "ValidationStage"},
                "framework_version": "2.0"
            },
            error_message="Validation framework consistency requirements not met",
            fix_suggestion="Update to use new validation framework components"
        ))
        
        # Load additional rules from configuration if available
        config_path = self.project_root / "backend" / "config" / "architecture_rules.json"
        if config_path.exists():
            try:
                import json
                with open(config_path) as f:
                    config_rules = json.load(f)
                for rule in config_rules:
                    self.rules.append(ArchitectureRule(**rule))
            except Exception as e:
                logger.warning(f"Failed to load architecture rules from config: {e}")
                
    def validate_class_interface(self, node: ast.ClassDef, file_path: Path) -> List[str]:
        """Validate a class definition against interface rules"""
        errors = []
        
        # Find matching rules
        matching_rules = [
            rule for rule in self.rules 
            if rule.rule_type == ArchitectureValidationType.CLASS_INTERFACE
            and rule.target == node.name
        ]
        
        for rule in matching_rules:
            # Check required methods
            methods = {
                m.name for m in node.body 
                if isinstance(m, ast.FunctionDef)
            }
            missing_methods = rule.requirements["methods"] - methods
            if missing_methods:
                errors.append(
                    f"{file_path}: Class {node.name} missing required methods: "
                    f"{missing_methods}"
                )
                
            # Check required attributes
            attributes = set()
            for child in node.body:
                if isinstance(child, ast.Assign):
                    for target in child.targets:
                        if isinstance(target, ast.Name):
                            attributes.add(target.id)
            missing_attrs = rule.requirements["attributes"] - attributes
            if missing_attrs:
                errors.append(
                    f"{file_path}: Class {node.name} missing required attributes: "
                    f"{missing_attrs}"
                )
                
            # Check base classes if specified
            if "base_classes" in rule.requirements:
                bases = {
                    base.id for base in node.bases 
                    if isinstance(base, ast.Name)
                }
                invalid_bases = bases - rule.requirements["base_classes"]
                if invalid_bases:
                    errors.append(
                        f"{file_path}: Class {node.name} has invalid base classes: "
                        f"{invalid_bases}"
                    )
                    
        return errors
        
    def validate_framework_consistency(self, node: ast.Module, file_path: Path) -> List[str]:
        """Validate framework consistency"""
        errors = []
        
        # Find matching rules
        matching_rules = [
            rule for rule in self.rules 
            if rule.rule_type == ArchitectureValidationType.FRAMEWORK_CONSISTENCY
        ]
        
        for rule in matching_rules:
            # Check deprecated imports
            deprecated = rule.requirements.get("deprecated_imports", set())
            required = rule.requirements.get("required_imports", set())
            
            imports = set()
            for n in ast.walk(node):
                if isinstance(n, ast.ImportFrom):
                    imports.update(name.name for name in n.names)
                    
            # Check for deprecated imports
            found_deprecated = imports & deprecated
            if found_deprecated:
                errors.append(
                    f"{file_path}: Using deprecated imports: {found_deprecated}"
                )
                
            # Check for required imports
            missing_required = required - imports
            if missing_required:
                errors.append(
                    f"{file_path}: Missing required imports: {missing_required}"
                )
                
        return errors
        
    def validate_file(self, file_path: Path) -> Dict[str, Any]:
        """Validate a single file"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read())
                
            # Validate framework consistency
            framework_errors = self.validate_framework_consistency(tree, file_path)
            if framework_errors:
                results["valid"] = False
                results["errors"].extend(framework_errors)
                
            # Validate class interfaces
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    interface_errors = self.validate_class_interface(node, file_path)
                    if interface_errors:
                        results["valid"] = False
                        results["errors"].extend(interface_errors)
                        
        except Exception as e:
            logger.warning(f"Failed to validate {file_path}: {str(e)}")
            results["warnings"].append(f"Failed to validate {file_path}: {str(e)}")
            
        return results
        
    def validate_architecture(self) -> Dict[str, Any]:
        """Validate entire codebase architecture"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        try:
            # Validate all Python files
            for py_file in self.project_root.rglob("*.py"):
                file_results = self.validate_file(py_file)
                
                if not file_results["valid"]:
                    results["valid"] = False
                    results["errors"].extend(file_results["errors"])
                results["warnings"].extend(file_results["warnings"])
                
        except Exception as e:
            logger.error(f"Architecture validation failed: {str(e)}")
            results["valid"] = False
            results["errors"].append(f"Architecture validation failed: {str(e)}")
            
        return results
