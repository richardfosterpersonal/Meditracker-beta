"""
Evidence Collection Verification Script
Critical Path: VALIDATION-VERIFY-EVIDENCE
Last Updated: 2025-01-02T13:29:35+01:00

Verifies evidence collection across ALL system components.
"""

import os
import sys
import ast
import glob
from pathlib import Path
from typing import Dict, Set, List, Tuple
from datetime import datetime, timezone

def find_all_components() -> List[str]:
    """Find all components in the system"""
    project_root = Path(__file__).parent.parent
    python_files = glob.glob(f"{str(project_root)}/**/*.py", recursive=True)
    
    components = []
    
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.FunctionDef)):
                    components.append(f"{file_path}:{node.name}")
                    
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            
    return components

def verify_evidence_collection(component_path: str) -> Tuple[bool, List[str]]:
    """Verify evidence collection for a component"""
    file_path, component_name = component_path.split(':')
    errors = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        tree = ast.parse(content)
        
        # Find the component
        component = None
        for node in ast.walk(tree):
            if isinstance(node, (ast.ClassDef, ast.FunctionDef)) and node.name == component_name:
                component = node
                break
                
        if not component:
            errors.append(f"Could not find component {component_name}")
            return False, errors
            
        # Check for evidence collection
        has_evidence = False
        has_timestamp = False
        has_validation = False
        
        for node in ast.walk(component):
            # Check for evidence collection calls
            if isinstance(node, ast.Call):
                call_str = ast.unparse(node)
                if 'store_evidence' in call_str:
                    has_evidence = True
                if 'datetime.now(timezone.utc)' in call_str:
                    has_timestamp = True
                if 'validate_critical_path' in call_str:
                    has_validation = True
                    
        if not has_evidence:
            errors.append("Missing evidence collection")
        if not has_timestamp:
            errors.append("Missing timestamp in evidence")
        if not has_validation:
            errors.append("Missing validation in evidence")
            
        return len(errors) == 0, errors
        
    except Exception as e:
        errors.append(f"Error verifying evidence collection: {str(e)}")
        return False, errors

def main():
    """Main verification function"""
    print("Finding all components...")
    components = find_all_components()
    
    print("Verifying evidence collection...")
    failed_components: Dict[str, List[str]] = {}
    
    for component in components:
        is_valid, errors = verify_evidence_collection(component)
        if not is_valid:
            failed_components[component] = errors
            
    if failed_components:
        print("\nEvidence collection verification failed!")
        print("The following components have evidence collection issues:")
        for component, errors in failed_components.items():
            print(f"\n{component}:")
            for error in errors:
                print(f"- {error}")
        sys.exit(1)
        
    print("\nEvidence collection verification passed!")
    sys.exit(0)

if __name__ == '__main__':
    main()
