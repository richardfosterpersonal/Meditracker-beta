"""
Validation Hook System
Critical Path: VALIDATION-HOOKS
Last Updated: 2025-01-02T13:39:20+01:00

Part of the unified adaptive validation system.
"""

from enum import Enum, auto
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timezone
from collections import defaultdict

from backend.app.exceptions import ValidationError

class ValidationStage(Enum):
    PRE_VALIDATION = auto()
    VALIDATION = auto()
    POST_VALIDATION = auto()

class ValidationHookPriority(Enum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3

class HookCompetencyLevel(Enum):
    EXPERT = 0
    ADVANCED = 1
    INTERMEDIATE = 2
    BASIC = 3

@dataclass
class HookPattern:
    """Adaptive validation hook pattern"""
    pattern_id: str
    relevance: float
    stage: ValidationStage
    priority: ValidationHookPriority
    competency: HookCompetencyLevel
    adaptations: List[Dict[str, Any]]
    last_updated: str

class ValidationHooks:
    """Adaptive validation hook system"""
    
    def __init__(self):
        self.hooks: Dict[str, List[HookPattern]] = defaultdict(list)
        self.adaptation_history: List[Dict[str, Any]] = []
        self.active_patterns: Dict[str, HookPattern] = {}
        
    def register_hook_pattern(
        self,
        pattern_id: str,
        relevance: float,
        stage: ValidationStage,
        priority: ValidationHookPriority = ValidationHookPriority.MEDIUM,
        competency: HookCompetencyLevel = HookCompetencyLevel.ADVANCED,
        adaptive: bool = True
    ) -> None:
        """Register a new hook pattern"""
        pattern = HookPattern(
            pattern_id=pattern_id,
            relevance=relevance,
            stage=stage,
            priority=priority,
            competency=competency,
            adaptations=[],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
        self.hooks[stage].append(pattern)
        self.active_patterns[pattern_id] = pattern
        
        if adaptive:
            self._adapt_priorities()
            
    def adapt_priorities(self, patterns: Dict[str, Any]) -> None:
        """Adapt hook priorities based on patterns"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Track adaptations
        adaptation = {
            'timestamp': timestamp,
            'action': 'adapt_priorities',
            'patterns': patterns
        }
        
        # Adjust priorities based on patterns
        for stage in ValidationStage:
            stage_hooks = self.hooks[stage]
            if not stage_hooks:
                continue
                
            # Calculate new priorities
            priorities = self._calculate_priorities(stage_hooks, patterns)
            
            # Update hook priorities
            for hook, priority in priorities.items():
                old_priority = hook.priority
                hook.priority = priority
                
                adaptation['changes'] = adaptation.get('changes', [])
                adaptation['changes'].append({
                    'hook': hook.pattern_id,
                    'old_priority': old_priority,
                    'new_priority': priority
                })
                
        self.adaptation_history.append(adaptation)
        
    def _calculate_priorities(
        self,
        hooks: List[HookPattern],
        patterns: Dict[str, Any]
    ) -> Dict[HookPattern, ValidationHookPriority]:
        """Calculate new priorities based on patterns"""
        priorities = {}
        
        for hook in hooks:
            # Base priority on pattern relevance
            if hook.relevance >= 0.8:
                priorities[hook] = ValidationHookPriority.CRITICAL
            elif hook.relevance >= 0.6:
                priorities[hook] = ValidationHookPriority.HIGH
            elif hook.relevance >= 0.4:
                priorities[hook] = ValidationHookPriority.MEDIUM
            else:
                priorities[hook] = ValidationHookPriority.LOW
                
            # Adjust based on competency
            if hook.competency == HookCompetencyLevel.EXPERT:
                # Expert hooks can be promoted
                if priorities[hook] != ValidationHookPriority.CRITICAL:
                    priorities[hook] = ValidationHookPriority(priorities[hook].value - 1)
                    
        return priorities
        
    def adapt_priorities_from_failure(self, error: ValidationError) -> None:
        """Learn from validation failures"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Extract patterns from error
        error_patterns = self._extract_error_patterns(error)
        
        # Adapt priorities based on failure patterns
        self.adapt_priorities({
            'error_patterns': error_patterns,
            'timestamp': timestamp
        })
        
    def _extract_error_patterns(self, error: ValidationError) -> List[Dict[str, Any]]:
        """Extract patterns from validation errors"""
        return [{
            'error_type': type(error).__name__,
            'message': str(error),
            'context': getattr(error, 'context', {}),
            'validation_context': getattr(error, 'validation_context', {})
        }]
        
    def run_pre_validation(self, context: Dict[str, Any]) -> None:
        """Run pre-validation hooks with adaptation"""
        self._run_stage_hooks(ValidationStage.PRE_VALIDATION, context)
        
    def run_validation(self, context: Dict[str, Any]) -> None:
        """Run validation hooks with adaptation"""
        self._run_stage_hooks(ValidationStage.VALIDATION, context)
        
    def run_post_validation(self, context: Dict[str, Any]) -> None:
        """Run post-validation hooks with adaptation"""
        self._run_stage_hooks(ValidationStage.POST_VALIDATION, context)
        
    def _run_stage_hooks(self, stage: ValidationStage, context: Dict[str, Any]) -> None:
        """Run hooks for a specific stage with adaptation"""
        stage_hooks = sorted(
            self.hooks[stage],
            key=lambda h: h.priority.value
        )
        
        for hook in stage_hooks:
            try:
                # Run hook with context
                self._run_hook(hook, context)
                
                # Learn from success
                self._learn_from_success(hook, context)
                
            except ValidationError as e:
                # Learn from failure
                self._learn_from_failure(hook, e, context)
                raise
                
    def _run_hook(self, hook: HookPattern, context: Dict[str, Any]) -> None:
        """Run a single hook with context"""
        # Implementation specific to hook pattern
        pass
        
    def _learn_from_success(
        self,
        hook: HookPattern,
        context: Dict[str, Any]
    ) -> None:
        """Learn from successful hook execution"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Record successful pattern
        success_pattern = {
            'timestamp': timestamp,
            'hook': hook.pattern_id,
            'context': context
        }
        
        # Update adaptation history
        self.adaptation_history.append({
            'timestamp': timestamp,
            'action': 'successful_hook',
            'pattern': success_pattern
        })
        
    def _learn_from_failure(
        self,
        hook: HookPattern,
        error: ValidationError,
        context: Dict[str, Any]
    ) -> None:
        """Learn from hook failures"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Record failure pattern
        failure_pattern = {
            'timestamp': timestamp,
            'hook': hook.pattern_id,
            'error': str(error),
            'context': context
        }
        
        # Update adaptation history
        self.adaptation_history.append({
            'timestamp': timestamp,
            'action': 'failed_hook',
            'pattern': failure_pattern
        })
        
        # Adapt priorities based on failure
        self.adapt_priorities_from_failure(error)
