"""
Import Path Validator
Critical Path: IMPORT-VAL-*
Last Updated: 2025-01-02T10:25:25+01:00

Enforces correct import paths and prevents circular dependencies.
"""

import ast
import logging
from pathlib import Path
from typing import Dict, Set, List, Optional, Any
from dataclasses import dataclass
import importlib.util

logger = logging.getLogger(__name__)

@dataclass
class ImportRule:
    """Rule for validating imports"""
    module_path: str
    required_prefix: str
    error_message: str
    critical: bool = True

class ImportValidationError(Exception):
    """Raised when import validation fails"""
    pass

class ImportValidator:
    """Validates import statements and module paths"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.import_rules = [
            ImportRule(
                "app.exceptions",
                "backend.app.exceptions",
                "All exceptions must be imported from backend.app.exceptions"
            ),
            ImportRule(
                "app.core",
                "backend.app.core",
                "Core modules must be imported from backend.app.core"
            ),
            ImportRule(
                "app.middleware",
                "backend.app.middleware",
                "Middleware must be imported from backend.app.middleware"
            ),
            ImportRule(
                "app.infrastructure",
                "backend.app.infrastructure",
                "Infrastructure modules must be imported from backend.app.infrastructure"
            )
        ]
        
    def analyze_imports(self, file_path: Path) -> Dict[str, List[str]]:
        """Analyze imports in a Python file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read())
                
            imports = {
                'import': [],
                'from': []
            }
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        imports['import'].append(name.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports['from'].append(node.module)
                        
            return imports
            
        except Exception as e:
            logger.error(f"Failed to analyze imports in {file_path}: {str(e)}")
            raise ImportValidationError(f"Import analysis failed: {str(e)}")
            
    def check_circular_imports(self, start_file: Path) -> Set[str]:
        """Check for circular imports starting from a file"""
        visited = set()
        import_chain = []
        
        def visit_module(module_path: str):
            if module_path in import_chain:
                cycle = ' -> '.join(import_chain[import_chain.index(module_path):])
                raise ImportValidationError(f"Circular import detected: {cycle}")
                
            if module_path in visited:
                return
                
            visited.add(module_path)
            import_chain.append(module_path)
            
            try:
                spec = importlib.util.find_spec(module_path)
                if spec and spec.origin:
                    file_path = Path(spec.origin)
                    imports = self.analyze_imports(file_path)
                    for imported in imports['from'] + imports['import']:
                        visit_module(imported)
            except ImportError:
                pass  # Skip external modules
                
            import_chain.pop()
            
        initial_module = start_file.stem
        visit_module(initial_module)
        return visited
        
    def check_module_exists(self, module_path: str) -> bool:
        """Check if a module exists and can be imported"""
        try:
            spec = importlib.util.find_spec(module_path)
            if spec is None:
                return False
            return True
        except (ImportError, ValueError):
            return False
            
    def validate_imports(self, file_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Validate imports against rules
        
        Args:
            file_path: Optional specific file to validate. If None, validates all Python files.
        """
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "files_checked": 0
        }
        
        files_to_check = []
        if file_path:
            files_to_check = [file_path]
        else:
            files_to_check = list(self.project_root.rglob("*.py"))
            
        for py_file in files_to_check:
            try:
                results["files_checked"] += 1
                imports = self.analyze_imports(py_file)
                
                # Check if modules exist and can be imported
                for import_type in imports:
                    for imp in imports[import_type]:
                        if not self.check_module_exists(imp):
                            error = f"{py_file}: Module '{imp}' does not exist or cannot be imported"
                            results["errors"].append(error)
                            
                # Check import rules
                for rule in self.import_rules:
                    for import_type in imports:
                        for imp in imports[import_type]:
                            if rule.module_path in imp and not imp.startswith(rule.required_prefix):
                                error = f"{py_file}: {rule.error_message}"
                                if rule.critical:
                                    results["errors"].append(error)
                                else:
                                    results["warnings"].append(error)
                                    
                # Check circular imports
                try:
                    self.check_circular_imports(py_file)
                except ImportValidationError as e:
                    results["errors"].append(f"{py_file}: {str(e)}")
                    
            except Exception as e:
                results["errors"].append(f"Failed to validate {py_file}: {str(e)}")
                
        results["valid"] = len(results["errors"]) == 0
        return results
        
    def fix_imports(self, file_path: Path) -> bool:
        """
        Attempt to fix import statements in a file
        
        Args:
            file_path: Path to file to fix
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            class ImportFixer(ast.NodeTransformer):
                def visit_ImportFrom(self, node):
                    if node.module:
                        for rule in self.import_rules:
                            if rule.module_path in node.module and not node.module.startswith(rule.required_prefix):
                                node.module = f"{rule.required_prefix}{node.module[len(rule.module_path):]}"
                    return node
                    
            fixer = ImportFixer()
            fixed_tree = fixer.visit(tree)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(ast.unparse(fixed_tree))
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to fix imports in {file_path}: {str(e)}")
            return False
