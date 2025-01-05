"""
Install Validation Git Hooks
Last Updated: 2024-12-27T19:46:40+01:00
Critical Path: Git Hooks
"""

import os
import sys
from pathlib import Path

def create_pre_commit_hook():
    """Create pre-commit hook for validation"""
    git_dir = Path(__file__).resolve().parent.parent / '.git'
    hooks_dir = git_dir / 'hooks'
    pre_commit = hooks_dir / 'pre-commit'
    
    hook_content = """#!/usr/bin/env python3
import sys
import subprocess
from pathlib import Path

def main():
    # Add backend to Python path
    backend_dir = Path(__file__).resolve().parent.parent.parent
    sys.path.append(str(backend_dir))
    
    # Run validation
    try:
        # Get changed files
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True,
            text=True
        )
        changed_files = result.stdout.splitlines()
        
        # Check if any critical path files changed
        critical_paths = [
            'app/core/',
            'app/infrastructure/',
            'app/domain/',
            '.env',
            'alembic.ini'
        ]
        
        needs_validation = any(
            any(path in file for path in critical_paths)
            for file in changed_files
        )
        
        if needs_validation:
            print("Critical path changes detected. Running validation...")
            from app.core.hooks.validation_hooks import ValidationEvent, hook_manager
            from app.core.beta_validator import beta_validator
            import asyncio
            
            # Run validation
            is_valid = asyncio.run(beta_validator.validate_beta_readiness())
            
            if not is_valid:
                print("Validation failed! Please fix the issues before committing.")
                sys.exit(1)
                
            print("Validation passed successfully!")
            
    except Exception as e:
        print(f"Error during validation: {str(e)}")
        sys.exit(1)
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
"""
    
    # Create hooks directory if it doesn't exist
    hooks_dir.mkdir(parents=True, exist_ok=True)
    
    # Write pre-commit hook
    with open(pre_commit, 'w') as f:
        f.write(hook_content)
    
    # Make hook executable
    pre_commit.chmod(0o755)
    
    print(f"Created pre-commit hook at {pre_commit}")

def main():
    """Install all validation hooks"""
    try:
        create_pre_commit_hook()
        print("Successfully installed validation hooks!")
        return 0
    except Exception as e:
        print(f"Error installing hooks: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
