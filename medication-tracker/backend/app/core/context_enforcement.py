"""
Context Enforcement Module
Critical Path: VALIDATION-CORE-*
Last Updated: 2025-01-01T20:58:45+01:00
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json

from .validation_chain import ValidationChain, ValidationComponent, ValidationType, ValidationPriority
from .context_types import ContextLevel

class ContextState:
    """Maintains the current context state"""
    def __init__(self):
        self.current_context: Dict[ContextLevel, str] = {}
        self.context_stack: list = []
        self.last_updated = datetime.utcnow()
        
    def push_context(self, level: ContextLevel, value: str) -> None:
        """Push new context"""
        self.context_stack.append((level, self.current_context.get(level)))
        self.current_context[level] = value
        self.last_updated = datetime.utcnow()
        
    def pop_context(self) -> None:
        """Pop context"""
        if not self.context_stack:
            return
            
        level, value = self.context_stack.pop()
        if value is None:
            self.current_context.pop(level, None)
        else:
            self.current_context[level] = value
        self.last_updated = datetime.utcnow()

class ContextEnforcer:
    """Enforces context maintenance and transitions"""
    def __init__(self):
        self.validation_chain = ValidationChain()
        self.state = ContextState()
        
    async def validate_context_switch(
        self,
        current_context: Dict[ContextLevel, str],
        new_context: Dict[ContextLevel, str]
    ) -> Dict[str, Any]:
        """Validate context switch"""
        try:
            # Start validation
            self.validation_chain.start_validation(
                "VALIDATION-CONTEXT-SWITCH",
                ValidationComponent.CORE,
                ValidationType.CHECK,
                ValidationPriority.HIGHEST
            )
            
            # Basic validation
            if not new_context:
                raise ValueError("New context cannot be empty")
                
            # Context level validation
            for level in new_context:
                if not isinstance(level, ContextLevel):
                    raise ValueError(f"Invalid context level: {level}")
                    
            # Context transition validation
            for level, value in new_context.items():
                if level in current_context:
                    # Validate transition
                    if not self._validate_transition(
                        level,
                        current_context[level],
                        value
                    ):
                        raise ValueError(
                            f"Invalid transition for {level}: "
                            f"{current_context[level]} -> {value}"
                        )
                        
            # Record evidence
            self.validation_chain.add_evidence(
                "context_switch",
                json.dumps({
                    "from": {k.name: v for k, v in current_context.items()},
                    "to": {k.name: v for k, v in new_context.items()},
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
            
            self.validation_chain.complete_validation()
            
            return {
                "valid": True,
                "context": new_context
            }
            
        except Exception as e:
            self.validation_chain.fail_validation(str(e))
            return {
                "valid": False,
                "error": str(e)
            }
            
    def _validate_transition(
        self,
        level: ContextLevel,
        from_value: str,
        to_value: str
    ) -> bool:
        """Validate specific context transition"""
        # Add specific transition rules here
        return True
