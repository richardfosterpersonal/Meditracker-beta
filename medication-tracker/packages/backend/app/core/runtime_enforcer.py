"""
Runtime Validation Enforcer
Critical Path: VALIDATION-ENFORCE-RUNTIME
Last Updated: 2025-01-02T13:39:20+01:00

Part of the unified adaptive validation system.
"""

import ast
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass
from collections import defaultdict

from .validation_types import ValidationResult, ValidationStatus
from backend.app.exceptions import ValidationError

@dataclass
class EnforcementPattern:
    """Runtime enforcement pattern with adaptivity"""
    pattern_id: str
    relevance: float
    rules: Dict[str, Any]
    adaptations: List[Dict[str, Any]]
    last_updated: str

class RuntimeEnforcer:
    """Adaptive runtime validation enforcer"""
    
    def __init__(self):
        self.patterns: Dict[str, EnforcementPattern] = {}
        self.adaptation_history: List[Dict[str, Any]] = []
        self.current_rules = defaultdict(list)
        
    def register_enforcement_pattern(
        self,
        pattern_id: str,
        relevance: float,
        rules: Optional[Dict[str, Any]] = None,
        adaptive: bool = True
    ) -> None:
        """Register a new enforcement pattern"""
        self.patterns[pattern_id] = EnforcementPattern(
            pattern_id=pattern_id,
            relevance=relevance,
            rules=rules or {},
            adaptations=[],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
    def update_rules(self, new_patterns: Dict[str, Any]) -> None:
        """Update enforcement rules based on new patterns"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        for category, rules in new_patterns.items():
            # Adapt existing rules
            if category in self.current_rules:
                self._adapt_rules(category, rules)
            else:
                # Add new rules with adaptation tracking
                self.current_rules[category].extend(rules)
                self.adaptation_history.append({
                    'timestamp': timestamp,
                    'action': 'add_rules',
                    'category': category,
                    'rules': rules
                })
                
    def _adapt_rules(self, category: str, new_rules: List[Any]) -> None:
        """Adapt existing rules based on new patterns"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Find overlapping rules
        existing = set(str(r) for r in self.current_rules[category])
        incoming = set(str(r) for r in new_rules)
        
        # Keep track of adaptations
        adaptation = {
            'timestamp': timestamp,
            'category': category,
            'added': list(incoming - existing),
            'removed': list(existing - incoming),
            'modified': []
        }
        
        # Update rules with adaptation tracking
        self.current_rules[category] = [
            rule for rule in self.current_rules[category]
            if str(rule) not in adaptation['removed']
        ]
        
        self.current_rules[category].extend([
            rule for rule in new_rules
            if str(rule) in adaptation['added']
        ])
        
        self.adaptation_history.append(adaptation)
        
    def adapt_rules_from_failure(self, error: ValidationError) -> None:
        """Learn from validation failures"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Extract patterns from error
        error_patterns = self._extract_error_patterns(error)
        
        # Adapt rules based on failure patterns
        for pattern in error_patterns:
            self.patterns[pattern['id']].adaptations.append({
                'timestamp': timestamp,
                'error_type': type(error).__name__,
                'pattern': pattern
            })
            
            # Update rules based on learned patterns
            self.update_rules({
                pattern['category']: pattern['rules']
            })
            
    def _extract_error_patterns(self, error: ValidationError) -> List[Dict[str, Any]]:
        """Extract patterns from validation errors"""
        patterns = []
        
        # Basic error pattern
        patterns.append({
            'id': f"error_{type(error).__name__}",
            'category': 'error_patterns',
            'rules': [{
                'type': type(error).__name__,
                'message': str(error),
                'context': getattr(error, 'context', {})
            }]
        })
        
        # Extract validation context if available
        if hasattr(error, 'validation_context'):
            patterns.append({
                'id': 'validation_context',
                'category': 'context_patterns',
                'rules': [{
                    'context': error.validation_context,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }]
            })
            
        return patterns
        
    def enforce(self, context: Dict[str, Any], adaptive: bool = True) -> None:
        """Enforce validation rules with adaptation"""
        try:
            # Apply current rules
            self._apply_rules(context)
            
            if adaptive:
                # Learn from successful validation
                self._learn_from_success(context)
                
        except ValidationError as e:
            if adaptive:
                # Learn from failure
                self.adapt_rules_from_failure(e)
            raise
            
    def _apply_rules(self, context: Dict[str, Any]) -> None:
        """Apply enforcement rules to context"""
        for category, rules in self.current_rules.items():
            for rule in rules:
                if not self._check_rule(rule, context):
                    raise ValidationError(
                        f"Validation failed for {category}: {rule}",
                        context=context
                    )
                    
    def _check_rule(self, rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Check if context satisfies a rule"""
        try:
            if 'condition' in rule:
                # Evaluate rule condition
                return eval(rule['condition'], {'context': context})
            return True
        except Exception as e:
            raise ValidationError(f"Rule evaluation failed: {str(e)}")
            
    def _learn_from_success(self, context: Dict[str, Any]) -> None:
        """Learn from successful validations"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Record successful pattern
        success_pattern = {
            'timestamp': timestamp,
            'context': context,
            'rules_applied': self.current_rules
        }
        
        # Update adaptation history
        self.adaptation_history.append({
            'timestamp': timestamp,
            'action': 'successful_validation',
            'pattern': success_pattern
        })
