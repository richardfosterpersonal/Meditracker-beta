"""
Beta Process Enforcer
Enforces the beta testing process and workflow
Last Updated: 2025-01-01T21:56:44+01:00
"""

import logging
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

from .pre_validation_requirements import (
    PreValidationRequirement,
    BetaValidationStatus,
    BetaValidationPriority,
    BetaValidationType,
    BetaValidationScope,
    BetaValidationResult
)
from .beta_validation import BetaValidationRunner
from ..models.beta_models import BetaPhase, BetaValidation
from ..database import get_db

logger = logging.getLogger(__name__)

class BetaStage(Enum):
    """Beta testing stages"""
    PLANNING = "planning"
    VALIDATION = "validation"
    ONBOARDING = "onboarding"
    TESTING = "testing"
    FEEDBACK = "feedback"
    ANALYSIS = "analysis"
    COMPLETION = "completion"

class BetaStageStatus(Enum):
    """Status of beta stages"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"

class BetaProcessEnforcer:
    """Enforces beta testing process"""
    
    def __init__(self):
        self.validation_runner = BetaValidationRunner()
        self._init_process_tracking()
        
    def _init_process_tracking(self) -> None:
        """Initialize process tracking"""
        self.process_file = Path("data/beta/process.json")
        self.process_file.parent.mkdir(parents=True, exist_ok=True)
        
        if not self.process_file.exists():
            self._save_process_state({
                'current_stage': BetaStage.PLANNING.value,
                'stages': {
                    stage.value: {
                        'status': BetaStageStatus.NOT_STARTED.value,
                        'started_at': None,
                        'completed_at': None,
                        'blockers': [],
                        'notes': []
                    }
                    for stage in BetaStage
                }
            })
            
    def _load_process_state(self) -> Dict:
        """Load process state"""
        if not self.process_file.exists():
            return {}
        return json.loads(self.process_file.read_text())
        
    def _save_process_state(self, state: Dict) -> None:
        """Save process state"""
        self.process_file.write_text(json.dumps(state, indent=2))
        
    def _can_proceed_to_stage(self, stage: BetaStage) -> bool:
        """Check if we can proceed to a stage"""
        state = self._load_process_state()
        current_stage = BetaStage(state['current_stage'])
        
        # Can't skip stages
        if list(BetaStage).index(stage) > list(BetaStage).index(current_stage) + 1:
            return False
            
        # Must complete current stage first
        if stage != current_stage and state['stages'][current_stage.value]['status'] != BetaStageStatus.COMPLETED.value:
            return False
            
        return True
        
    async def start_stage(self, stage: BetaStage) -> Dict:
        """Start a beta testing stage"""
        if not self._can_proceed_to_stage(stage):
            raise ValueError(f"Cannot proceed to {stage.value} stage")
            
        state = self._load_process_state()
        stage_state = state['stages'][stage.value]
        
        if stage_state['status'] not in [BetaStageStatus.NOT_STARTED.value, BetaStageStatus.BLOCKED.value]:
            raise ValueError(f"Stage {stage.value} already started")
            
        # Special handling for validation stage
        if stage == BetaStage.VALIDATION:
            validation_results = await self.validation_runner.validate_beta_readiness()
            failed_validations = [r for r in validation_results if r.status == BetaValidationStatus.FAILED]
            
            if failed_validations:
                stage_state['status'] = BetaStageStatus.BLOCKED.value
                stage_state['blockers'] = [
                    {
                        'requirement': r.requirement.value,
                        'message': r.message,
                        'action': r.corrective_action
                    }
                    for r in failed_validations
                ]
            else:
                stage_state['status'] = BetaStageStatus.IN_PROGRESS.value
                stage_state['blockers'] = []
                
        else:
            stage_state['status'] = BetaStageStatus.IN_PROGRESS.value
            
        stage_state['started_at'] = datetime.utcnow().isoformat()
        state['current_stage'] = stage.value
        self._save_process_state(state)
        
        return stage_state
        
    def complete_stage(self, stage: BetaStage, notes: Optional[str] = None) -> Dict:
        """Complete a beta testing stage"""
        state = self._load_process_state()
        stage_state = state['stages'][stage.value]
        
        if stage_state['status'] != BetaStageStatus.IN_PROGRESS.value:
            raise ValueError(f"Stage {stage.value} not in progress")
            
        if notes:
            stage_state['notes'].append({
                'timestamp': datetime.utcnow().isoformat(),
                'content': notes
            })
            
        stage_state['status'] = BetaStageStatus.COMPLETED.value
        stage_state['completed_at'] = datetime.utcnow().isoformat()
        self._save_process_state(state)
        
        return stage_state
        
    def add_stage_note(self, stage: BetaStage, note: str) -> Dict:
        """Add a note to a stage"""
        state = self._load_process_state()
        stage_state = state['stages'][stage.value]
        
        stage_state['notes'].append({
            'timestamp': datetime.utcnow().isoformat(),
            'content': note
        })
        
        self._save_process_state(state)
        return stage_state
        
    def get_stage_status(self, stage: BetaStage) -> Dict:
        """Get status of a stage"""
        state = self._load_process_state()
        return state['stages'][stage.value]
        
    def get_process_summary(self) -> Dict:
        """Get summary of entire process"""
        state = self._load_process_state()
        current_stage = BetaStage(state['current_stage'])
        
        summary = {
            'current_stage': current_stage.value,
            'progress': {
                'completed': len([
                    s for s in state['stages'].values()
                    if s['status'] == BetaStageStatus.COMPLETED.value
                ]),
                'total': len(BetaStage)
            },
            'blockers': []
        }
        
        for stage_name, stage_state in state['stages'].items():
            if stage_state['blockers']:
                summary['blockers'].extend([
                    {
                        'stage': stage_name,
                        **blocker
                    }
                    for blocker in stage_state['blockers']
                ])
                
        return summary
        
    def format_process_summary(self) -> str:
        """Format process summary for display"""
        state = self._load_process_state()
        current_stage = BetaStage(state['current_stage'])
        output = []
        
        # Header
        output.append("🔄 BETA TESTING PROCESS")
        output.append(f"Current Stage: {current_stage.value.upper()}")
        
        # Stages
        for stage in BetaStage:
            stage_state = state['stages'][stage.value]
            status = stage_state['status']
            
            if status == BetaStageStatus.COMPLETED.value:
                icon = "✅"
            elif status == BetaStageStatus.IN_PROGRESS.value:
                icon = "⏳"
            elif status == BetaStageStatus.BLOCKED.value:
                icon = "⚠️"
            elif status == BetaStageStatus.FAILED.value:
                icon = "❌"
            else:
                icon = "⭕"
                
            output.append(f"\n{icon} {stage.value.upper()}")
            
            if stage_state['started_at']:
                output.append(f"   Started: {stage_state['started_at']}")
                
            if stage_state['completed_at']:
                output.append(f"   Completed: {stage_state['completed_at']}")
                
            if stage_state['blockers']:
                output.append("   Blockers:")
                for blocker in stage_state['blockers']:
                    output.append(f"   - {blocker['message']}")
                    output.append(f"     Action: {blocker['action']}")
                    
            if stage_state['notes']:
                output.append("   Notes:")
                for note in stage_state['notes']:
                    output.append(f"   - {note['content']}")
                    
        # Progress
        completed = len([
            s for s in state['stages'].values()
            if s['status'] == BetaStageStatus.COMPLETED.value
        ])
        total = len(BetaStage)
        progress = (completed / total) * 100
        
        output.append(f"\nProgress: {progress:.1f}% ({completed}/{total} stages completed)")
        
        return "\n".join(output)

async def enforce_beta_process() -> None:
    """Enforce beta process and display status"""
    enforcer = BetaProcessEnforcer()
    
    # Try to start validation stage
    try:
        await enforcer.start_stage(BetaStage.VALIDATION)
    except ValueError as e:
        logger.error(f"Failed to start validation stage: {str(e)}")
        
    print(enforcer.format_process_summary())
