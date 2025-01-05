"""
Unified Validation Enforcement Script
Critical Path: VALIDATION-ENFORCE-SCRIPT
Last Updated: 2025-01-02T13:29:35+01:00

Enforces unified validation across ALL system components.
"""

import os
import sys
import ast
import glob
from pathlib import Path
from typing import List, Set

def find_python_files(root_dir: str) -> List[str]:
    """Find all Python files in the project"""
    return glob.glob(f"{root_dir}/**/*.py", recursive=True)

def check_unified_validation(file_path: str) -> bool:
    """Check if file uses unified validation"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Parse the Python file
        tree = ast.parse(content)
        
        # Track what we've found
        has_unified_import = False
        has_unified_decorator = False
        has_evidence_collection = False
        has_critical_path = False
        
        # Check imports
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for name in node.names:
                    if 'unified_validation_framework' in name.name:
                        has_unified_import = True
            elif isinstance(node, ast.ImportFrom):
                if 'unified_validation_framework' in node.module:
                    has_unified_import = True
                    
            # Check for decorator usage
            elif isinstance(node, ast.Decorator):
                if 'unified_validation' in ast.unparse(node):
                    has_unified_decorator = True
                    
            # Check for evidence collection
            elif isinstance(node, ast.Call):
                if 'validate_critical_path' in ast.unparse(node):
                    has_evidence_collection = True
                    
            # Check for critical path documentation
            elif isinstance(node, ast.Str):
                if 'Critical Path:' in node.s:
                    has_critical_path = True
                    
        # Skip empty files or __init__.py
        if not content.strip() or file_path.endswith('__init__.py'):
            return True
            
        # All components must have these
        requirements_met = (
            has_unified_import and
            has_unified_decorator and
            has_evidence_collection and
            has_critical_path
        )
        
        if not requirements_met:
            print(f"\nValidation failed for {file_path}:")
            if not has_unified_import:
                print("- Missing unified validation framework import")
            if not has_unified_decorator:
                print("- Missing @unified_validation decorator")
            if not has_evidence_collection:
                print("- Missing evidence collection")
            if not has_critical_path:
                print("- Missing critical path documentation")
                
        return requirements_met
        
    except Exception as e:
        print(f"Error checking {file_path}: {str(e)}")
        return False

def main():
    """Main enforcement function"""
    project_root = Path(__file__).parent.parent
    python_files = find_python_files(str(project_root))
    
    failed_files: Set[str] = set()
    
    for file_path in python_files:
        if not check_unified_validation(file_path):
            failed_files.add(file_path)
            
    if failed_files:
        print("\nUnified validation enforcement failed!")
        print("The following files do not meet unified validation requirements:")
        for file in failed_files:
            print(f"- {file}")
        sys.exit(1)
        
    print("\nUnified validation enforcement passed!")
    sys.exit(0)

if __name__ == '__main__':
    main()
