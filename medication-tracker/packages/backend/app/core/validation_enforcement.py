"""
Validation Process Enforcement
Critical Path: VALIDATION-ENFORCEMENT
Last Updated: 2025-01-02T14:17:33+01:00
"""

import ast
import logging
from pathlib import Path
from typing import Dict, List, Set, Optional
from functools import wraps
from datetime import datetime
import json

from .unified_validation_framework import UnifiedValidationFramework
from ..exceptions import (
    ValidationError,
    RequirementError,
    BetaValidationError
)

logger = logging.getLogger(__name__)

class ValidationEnforcer:
    """Enforces validation process"""
    
    def __init__(self):
        self.framework = UnifiedValidationFramework()
        self.validation_cache = {}
        self.required_imports = {
            'exceptions': {
                'ValidationError',
                'RequirementError',
                'BetaValidationError'
            },
            'pre_validation_requirements': {
                'PreValidationRequirement',
                'BetaValidationStatus',
                'BetaValidationPriority',
                'BetaValidationType',
                'BetaValidationScope',
                'BetaValidationResult'
            }
        }
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.validation_chain_file = (
            self.project_root / "docs" / "validation" / "VALIDATION_CHAIN.json"
        )
        
    def enforce_validation_imports(self, filepath: str) -> None:
        """Enforce required validation imports"""
        try:
            with open(filepath, 'r') as f:
                tree = ast.parse(f.read())
                
            imports = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    if node.module and 'exceptions' in node.module:
                        imports.update(n.name for n in node.names)
                    elif node.module and 'pre_validation_requirements' in node.module:
                        imports.update(n.name for n in node.names)
                        
            missing_imports = set()
            for module, required in self.required_imports.items():
                if any(imp in imports for imp in required):
                    missing = required - imports
                    if missing:
                        missing_imports.update(missing)
                        
            if missing_imports:
                raise ValidationError(
                    f"Missing required validation imports in {filepath}: "
                    f"{', '.join(missing_imports)}"
                )
                
        except Exception as e:
            logger.error(f"Import validation failed for {filepath}: {str(e)}")
            raise ValidationError(f"Import validation failed: {str(e)}")
            
    def validate_requirements(self, requirements: List[str]):
        """Decorator to enforce validation requirements"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                for req in requirements:
                    self._validate_requirement(req)
                return func(*args, **kwargs)
            return wrapper
        return decorator
        
    def _validate_requirement(self, requirement: str) -> None:
        """Validate a single requirement"""
        try:
            self.framework.validate({
                "type": "requirement",
                "requirement": requirement,
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Requirement validation failed: {str(e)}")
            raise RequirementError(f"Failed to validate requirement {requirement}: {str(e)}")
            
    def enforce_beta_validation(self, filepath: str) -> None:
        """Enforce beta validation requirements"""
        with open(filepath, 'r') as f:
            tree = ast.parse(f.read())
            
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if 'beta' in node.name.lower():
                    methods = {
                        n.name for n in node.body
                        if isinstance(n, ast.FunctionDef)
                    }
                    
                    required_methods = {
                        'validate_beta_readiness',
                        'validate_requirements',
                        'validate_data'
                    }
                    
                    missing_methods = required_methods - methods
                    if missing_methods:
                        raise BetaValidationError(
                            f"Beta class {node.name} in {filepath} missing "
                            f"required methods: {', '.join(missing_methods)}"
                        )
                        
    def enforce_file_structure(self, directory: Path) -> None:
        """Enforce validation file structure"""
        required_files = {
            'pre_validation_requirements.py',
            'beta_validation.py',
            'beta_process.py',
            'validation_enforcement.py'
        }
        
        existing_files = {
            f.name for f in directory.glob('*.py')
            if f.is_file()
        }
        
        missing_files = required_files - existing_files
        if missing_files:
            raise ValidationError(
                f"Missing required validation files: {', '.join(missing_files)}"
            )
            
    def enforce_validation_coverage(self, directory: Path) -> None:
        """Enforce validation coverage"""
        validation_functions = set()
        total_functions = set()
        
        for file in directory.rglob('*.py'):
            with open(file, 'r') as f:
                tree = ast.parse(f.read())
                
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    total_functions.add(f"{file.name}:{node.name}")
                    if 'validate' in node.name.lower():
                        validation_functions.add(f"{file.name}:{node.name}")
                        
        coverage = len(validation_functions) / len(total_functions) if total_functions else 0
        if coverage < 0.1:  # At least 10% of functions should be validation
            raise ValidationError(
                f"Insufficient validation coverage: {coverage:.1%}. "
                "Need at least 10% validation functions."
            )
            
    def check_validation_chain(self) -> None:
        """Check validation chain status"""
        if not self.validation_chain_file.exists():
            raise ValidationError("Validation chain file not found")
            
        try:
            with open(self.validation_chain_file, 'r') as f:
                chain = json.loads(f.read())
                
            if chain.get('validation_required', False):
                raise ValidationError(
                    "Validation chain requires synchronization. "
                    "Run sync_validation_chain.py first"
                )
                
            if chain.get('validation_status') != 'valid':
                raise ValidationError(
                    "Validation chain is invalid. "
                    "Fix validation issues before proceeding"
                )
                
        except json.JSONDecodeError:
            raise ValidationError("Invalid validation chain file format")
            
def create_validation_hook():
    """Create pre-commit hook for validation"""
    hook_path = Path(__file__).parent.parent.parent.parent / ".git" / "hooks" / "pre-commit"
    
    hook_content = """#!/bin/sh
# Validation pre-commit hook
python -m scripts.validate_critical_path || exit 1
"""
    
    hook_path.write_text(hook_content)
    hook_path.chmod(0o755)  # Make executable

def main():
    """Main validation enforcement entry point"""
    try:
        enforcer = ValidationEnforcer()
        backend_dir = Path('app')
        
        # Check validation chain first
        enforcer.check_validation_chain()
        
        # Enforce file structure
        enforcer.enforce_file_structure(backend_dir / 'core')
        
        # Enforce validation coverage
        enforcer.enforce_validation_coverage(backend_dir)
        
        # Check all Python files
        for file in backend_dir.rglob('*.py'):
            enforcer.enforce_validation_imports(str(file))
            enforcer.enforce_beta_validation(str(file))
            
        print("✅ All validation checks passed")
        return 0
        
    except Exception as e:
        print(f"❌ Validation check failed: {str(e)}")
        return 1
        
if __name__ == '__main__':
    exit(main())
