"""
Validation Enforcement System
Critical Path: VALIDATION-ENF-*
Last Updated: 2025-01-01T22:29:21+01:00

This module enforces validation rules across the codebase.
It runs as part of the pre-commit hook and CI/CD pipeline.
"""

import ast
from pathlib import Path
from typing import Set, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class ValidationEnforcer:
    """Enforces validation rules across the codebase"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.violations: List[str] = []
        
    def enforce_single_exception_file(self) -> bool:
        """Ensure only one exceptions.py exists"""
        exception_files = list(self.project_root.glob("**/exceptions.py"))
        if len(exception_files) > 1:
            self.violations.append(
                f"Multiple exception files found: {[str(f) for f in exception_files]}"
                "\nOnly one exceptions.py should exist at backend/app/exceptions.py"
            )
            return False
        return True
        
    def enforce_exception_imports(self) -> bool:
        """Ensure exceptions are only imported from backend.app.exceptions"""
        valid = True
        for py_file in self.project_root.glob("**/*.py"):
            if py_file.name == "exceptions.py":
                continue
                
            try:
                with open(py_file) as f:
                    tree = ast.parse(f.read())
                    
                class ImportVisitor(ast.NodeVisitor):
                    def __init__(self):
                        self.invalid_imports = []
                        
                    def visit_ImportFrom(self, node):
                        if (node.module and "exceptions" in node.module and 
                            node.module != "backend.app.exceptions"):
                            self.invalid_imports.append(node.module)
                        self.generic_visit(node)
                        
                visitor = ImportVisitor()
                visitor.visit(tree)
                
                if visitor.invalid_imports:
                    self.violations.append(
                        f"Invalid exception imports in {py_file}:"
                        f"\n  - {visitor.invalid_imports}"
                        "\nAll exceptions must be imported from backend.app.exceptions"
                    )
                    valid = False
                    
            except Exception as e:
                logger.error(f"Failed to check imports in {py_file}: {str(e)}")
                valid = False
                
        return valid
        
    def enforce_exception_hierarchy(self) -> bool:
        """Ensure all exceptions follow the hierarchy"""
        try:
            exceptions_file = self.project_root / "backend" / "app" / "exceptions.py"
            if not exceptions_file.exists():
                self.violations.append("exceptions.py not found")
                return False
                
            with open(exceptions_file) as f:
                tree = ast.parse(f.read())
                
            class HierarchyVisitor(ast.NodeVisitor):
                def __init__(self):
                    self.violations = []
                    self.valid_bases = {
                        "ApplicationError",
                        "ValidationError",
                        "SecurityError", 
                        "ResourceError",
                        "InfrastructureError",
                        "BetaError"
                    }
                    
                def visit_ClassDef(self, node):
                    if node.name.endswith("Error"):
                        if not node.bases:
                            self.violations.append(
                                f"Exception {node.name} must inherit from a base class"
                            )
                        else:
                            for base in node.bases:
                                if (isinstance(base, ast.Name) and 
                                    base.id not in self.valid_bases):
                                    self.violations.append(
                                        f"Exception {node.name} has invalid base {base.id}"
                                    )
                    self.generic_visit(node)
                    
            visitor = HierarchyVisitor()
            visitor.visit(tree)
            
            if visitor.violations:
                self.violations.extend(visitor.violations)
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to check exception hierarchy: {str(e)}")
            return False
            
    def enforce_validation(self) -> bool:
        """Run all validation checks"""
        valid = True
        
        # Core validation rules
        if not self.enforce_single_exception_file():
            valid = False
            
        if not self.enforce_exception_imports():
            valid = False
            
        if not self.enforce_exception_hierarchy():
            valid = False
            
        if not valid:
            logger.error("Validation violations found:")
            for violation in self.violations:
                logger.error(f"  - {violation}")
                
        return valid

def enforce_validation(project_root: Optional[Path] = None) -> bool:
    """Main entry point for validation enforcement"""
    if project_root is None:
        project_root = Path(__file__).parent.parent.parent
        
    enforcer = ValidationEnforcer(project_root)
    return enforcer.enforce_validation()
