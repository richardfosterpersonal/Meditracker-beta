"""
Critical Path Recovery Handler
Focus: Beta.Recovery.Critical

Handles recovery for critical validation failures only.
"""

import logging
import os
import secrets
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from .validation_hooks import ValidationHooks

logger = logging.getLogger(__name__)

@dataclass
class RecoveryStep:
    """A critical recovery step"""
    description: str
    action: str
    automated: bool

class ValidationRecoveryHandler:
    """Handles critical path recovery
    Focus: Beta.Recovery.Core
    
    Cross-references:
    - validation_hooks.py: Hook system
    - CURRENT_STATUS.md: Status tracking
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        
    def get_recovery_plan(self, validation_results: Dict) -> Optional[List[RecoveryStep]]:
        """Generate recovery steps for critical failures only"""
        if not validation_results or validation_results.get('status') == 'PASSED':
            return None
            
        steps = []
        issues = validation_results.get('details', {}).get('issues', [])
        
        for issue in issues:
            # Environment Variables
            if 'JWT_SECRET_KEY' in issue:
                steps.append(RecoveryStep(
                    description="Generate secure JWT key",
                    action=f"echo 'JWT_SECRET_KEY={secrets.token_urlsafe(48)}' >> .env",
                    automated=True
                ))
            elif 'DATABASE_URL' in issue:
                steps.append(RecoveryStep(
                    description="Setup SQLite database",
                    action=f"echo 'DATABASE_URL=sqlite:///{self.project_root}/backend/app.db' >> .env",
                    automated=True
                ))
                
            # Critical Dependencies
            elif any(x in issue.lower() for x in ['fastapi', 'uvicorn', 'sqlalchemy']):
                steps.append(RecoveryStep(
                    description="Install core dependencies",
                    action="pip install -r requirements.txt",
                    automated=True
                ))
                
            # Database
            elif 'database' in issue.lower() and 'migration' in issue.lower():
                steps.append(RecoveryStep(
                    description="Run database migrations",
                    action="alembic upgrade head",
                    automated=True
                ))
                
        return steps if steps else None
        
    def execute_recovery(self, steps: List[RecoveryStep]) -> Tuple[bool, List[str]]:
        """Execute critical recovery steps with validation hooks"""
        messages = []
        success = True
        
        # Pre-recovery validation
        try:
            ValidationHooks.run_hooks('pre_recovery', {'steps': steps})
        except Exception as e:
            return False, [f"Pre-recovery validation failed: {str(e)}"]
        
        for step in steps:
            if not step.automated:
                messages.append(f"Manual step required: {step.description}")
                messages.append(f"Run: {step.action}")
                continue
                
            try:
                logger.info(f"Executing: {step.description}")
                result = subprocess.run(
                    step.action,
                    shell=True,
                    capture_output=True,
                    text=True,
                    cwd=str(self.project_root)
                )
                
                if result.returncode == 0:
                    messages.append(f"✓ {step.description}")
                else:
                    success = False
                    messages.append(f"✗ {step.description}")
                    messages.append(f"Error: {result.stderr}")
                    break
                    
            except Exception as e:
                success = False
                messages.append(f"✗ Error: {str(e)}")
                break
                
        # Post-recovery validation
        try:
            ValidationHooks.run_hooks('post_recovery', {
                'validation_results': {
                    'success': success,
                    'messages': messages
                }
            })
        except Exception as e:
            success = False
            messages.append(f"Post-recovery validation failed: {str(e)}")
            
        return success, messages
