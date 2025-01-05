"""
Validation Result Model
Critical Path: VALIDATION-MODELS
Last Updated: 2025-01-02T14:17:33+01:00
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone

class ValidationResult:
    """Validation result with evidence"""
    
    def __init__(self, is_valid: bool, evidence: Dict[str, Any]):
        self.is_valid = is_valid
        self.evidence = evidence
        self.timestamp = datetime.now(timezone.utc).isoformat()
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "is_valid": self.is_valid,
            "evidence": self.evidence,
            "timestamp": self.timestamp
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationResult':
        """Create from dictionary"""
        return cls(
            is_valid=data["is_valid"],
            evidence=data["evidence"]
        )
