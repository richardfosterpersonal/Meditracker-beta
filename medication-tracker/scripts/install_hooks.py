#!/usr/bin/env python
"""
Install git hooks for validation enforcement
Critical Path: Validation.Setup
"""

import os
import shutil
from pathlib import Path

def install_hooks():
    """Install git hooks"""
    project_root = Path(__file__).parent.parent
    hooks_dir = project_root / '.git' / 'hooks'
    source_dir = project_root / 'scripts' / 'hooks'
    
    # Create hooks directory if it doesn't exist
    hooks_dir.mkdir(parents=True, exist_ok=True)
    
    # Install pre-commit hook
    pre_commit_source = source_dir / 'pre-commit.py'
    pre_commit_target = hooks_dir / 'pre-commit'
    
    if pre_commit_target.exists():
        print("Backing up existing pre-commit hook...")
        backup = pre_commit_target.with_suffix('.bak')
        shutil.copy2(pre_commit_target, backup)
    
    print("Installing pre-commit hook...")
    shutil.copy2(pre_commit_source, pre_commit_target)
    pre_commit_target.chmod(0o755)  # Make executable
    
    print("✅ Hooks installed successfully")

if __name__ == '__main__':
    install_hooks()
