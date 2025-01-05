"""
Validation Bootstrap Module
Critical Path: VALIDATION-BOOTSTRAP
Last Updated: 2025-01-02T14:17:33+01:00
"""

import ast
import logging
import json
from pathlib import Path
from typing import Dict, Set, List
from datetime import datetime

from .unified_validation_framework import UnifiedValidationFramework
from ..exceptions import ValidationError, BetaValidationError

logger = logging.getLogger(__name__)

class ValidationBootstrap:
    """Bootstraps the validation system"""
    
    def __init__(self):
        self.framework = UnifiedValidationFramework()
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.core_path = self.project_root / "backend" / "app" / "core"
        self.validation_modules = {
            "pre_validation_requirements.py": {
                "required_classes": [
                    "PreValidationRequirement",
                    "PreValidationManager"
                ]
            },
            "validation_chain.py": {
                "required_classes": ["ValidationChain"]
            },
            "validation_metrics.py": {
                "required_classes": ["ValidationMetrics"]
            },
            "validation_enforcement.py": {
                "required_classes": ["ValidationEnforcer"]
            },
            "unified_validation_framework.py": {
                "required_classes": ["UnifiedValidationFramework"]
            }
        }
        
    def check_core_modules(self) -> None:
        """Verify all core validation modules exist and have required classes"""
        for module, config in self.validation_modules.items():
            module_path = self.core_path / module
            if not module_path.exists():
                raise ValidationError(f"Missing core validation module: {module}")
                
            with open(module_path) as f:
                tree = ast.parse(f.read())
                
            found_classes = {
                node.name
                for node in ast.walk(tree)
                if isinstance(node, ast.ClassDef)
            }
            
            missing_classes = set(config["required_classes"]) - found_classes
            if missing_classes:
                raise ValidationError(
                    f"Missing required classes in {module}: {missing_classes}"
                )
                
    def check_circular_imports(self) -> None:
        """Check for circular imports in validation system"""
        for module in self.validation_modules:
            module_path = self.core_path / module
            if module_path.exists():
                self.analyze_imports(module_path)
                
    @staticmethod
    def analyze_imports(file_path: Path, import_chain: Set[str] = None) -> None:
        """Analyze imports in a file for circular dependencies"""
        if import_chain is None:
            import_chain = set()
            
        if str(file_path) in import_chain:
            raise ValidationError(f"Circular import detected: {import_chain}")
            
        import_chain.add(str(file_path))
        
        with open(file_path) as f:
            tree = ast.parse(f.read())
            
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if node.module:
                    module_parts = node.module.split('.')
                    if 'validation' in module_parts:
                        module_path = file_path.parent
                        for part in module_parts:
                            module_path = module_path / f"{part}.py"
                            if module_path.exists():
                                ValidationBootstrap.analyze_imports(
                                    module_path,
                                    import_chain
                                )
                                
    def check_exception_hierarchy(self) -> None:
        """Verify exception hierarchy is properly defined"""
        exceptions_path = (
            self.project_root / "backend" / "app" / "exceptions.py"
        )
        if not exceptions_path.exists():
            raise ValidationError("Missing exceptions.py")
            
        with open(exceptions_path) as f:
            tree = ast.parse(f.read())
            
        validation_exceptions = {
            node.name: {
                base.id for base in node.bases
                if isinstance(base, ast.Name)
            }
            for node in ast.walk(tree)
            if isinstance(node, ast.ClassDef)
            and 'Validation' in node.name
        }
        
        if not validation_exceptions:
            raise ValidationError("No validation exceptions defined")
            
        for exc_name, bases in validation_exceptions.items():
            if not any(
                base in {'Exception', 'ValidationError'}
                for base in bases
            ):
                raise ValidationError(
                    f"Invalid exception hierarchy for {exc_name}"
                )
                
    def check_critical_paths(self) -> None:
        """Verify critical paths are defined in all validation modules"""
        for module in self.validation_modules:
            module_path = self.core_path / module
            if not module_path.exists():
                continue
                
            with open(module_path) as f:
                content = f.read()
                if 'Critical Path:' not in content:
                    raise ValidationError(
                        f"Missing Critical Path in {module}"
                    )
                    
    def check_validation_chain_integrity(self) -> None:
        """Verify validation chain integrity"""
        chain_file = self.project_root / "docs" / "validation" / "VALIDATION_CHAIN.json"
        if not chain_file.exists():
            raise ValidationError("Missing validation chain file")
            
        with open(chain_file) as f:
            chain = json.load(f)
            
        required_keys = {"last_updated", "critical_paths", "validation_status"}
        if not all(key in chain for key in required_keys):
            raise ValidationError("Invalid validation chain structure")
            
        # Verify chain is up to date
        last_updated = datetime.fromisoformat(chain["last_updated"])
        age = datetime.utcnow() - last_updated
        if age.days > 7:
            raise ValidationError("Validation chain is outdated")
            
    def bootstrap(self) -> bool:
        """Run all bootstrap checks"""
        checks = [
            self.check_core_modules,
            self.check_circular_imports,
            self.check_exception_hierarchy,
            self.check_critical_paths,
            self.check_validation_chain_integrity
        ]
        
        print("\n🔄 Running Validation Bootstrap Checks")
        print("=" * 50)
        
        for check_func in checks:
            try:
                print(f"\n⚡ Checking {check_func.__name__}...")
                check_func()
                print(f"✅ {check_func.__name__} - Passed")
            except ValidationError as e:
                print(f"❌ {check_func.__name__} - Failed: {str(e)}")
                return False
                
        print("\n✅ All bootstrap checks passed!")
        return True

if __name__ == "__main__":
    bootstrap = ValidationBootstrap()
    sys.exit(0 if bootstrap.bootstrap() else 1)
