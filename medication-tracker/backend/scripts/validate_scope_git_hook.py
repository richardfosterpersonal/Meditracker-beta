"""
Git Hook Scope Validation Script
Last Updated: 2024-12-25T22:58:18+01:00
Critical Path: Tools.Validation
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

def get_changed_files() -> List[str]:
    """Get list of changed files in the current commit"""
    changed_files = os.popen('git diff --cached --name-only').read().splitlines()
    return [f for f in changed_files if f.endswith('.py')]

def check_feature_validation(file_path: str) -> Tuple[bool, str]:
    """Check if a file has proper validation for new features"""
    with open(file_path, 'r') as f:
        content = f.read()
        
    # Look for new class definitions
    new_classes = [
        line.split('class')[1].split(':')[0].strip()
        for line in content.split('\n')
        if line.strip().startswith('class')
    ]
    
    # Check for validation documents
    for class_name in new_classes:
        validation_path = Path('docs/validation') / f"{class_name}_validation.md"
        if not validation_path.exists():
            return False, f"Missing validation for {class_name} in {file_path}"
            
    return True, ""

def check_critical_path() -> Tuple[bool, str]:
    """Verify critical path compliance"""
    critical_path = Path('docs/CRITICAL_PATH.md')
    if not critical_path.exists():
        return False, "Critical path document missing"
        
    with open(critical_path) as f:
        content = f.read()
        if '[ ]' in content:
            return False, "Unchecked items in critical path"
            
    return True, ""

def main() -> int:
    """Main validation function"""
    errors = []
    
    # Check critical path
    is_valid, error = check_critical_path()
    if not is_valid:
        errors.append(error)
    
    # Check changed files
    changed_files = get_changed_files()
    for file_path in changed_files:
        is_valid, error = check_feature_validation(file_path)
        if not is_valid:
            errors.append(error)
    
    # Run scope checker
    scope_check = os.system('python backend/scripts/sonar-scope-check.py backend/app')
    if scope_check != 0:
        errors.append("Scope validation failed")
    
    if errors:
        print("\nScope validation errors:")
        for error in errors:
            print(f"- {error}")
        return 1
        
    print("\nScope validation passed")
    return 0

if __name__ == '__main__':
    sys.exit(main())
