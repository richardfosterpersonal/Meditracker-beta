"""
Validation Models
Critical Path: VALIDATION-MODELS
Last Updated: 2025-01-02T14:17:33+01:00
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from enum import Enum
from ..core.unified_validation_framework import UnifiedValidationFramework

class ValidationEvidence:
    """Evidence collected during validation"""
    
    def __init__(self):
        self.evidence: Dict[str, Any] = {}
        self.timestamp = datetime.now(timezone.utc).isoformat()
        
    def add_evidence(self, key: str, value: Any) -> None:
        """Add evidence"""
        self.evidence[key] = value
        
    def get_evidence(self, key: str) -> Optional[Any]:
        """Get evidence"""
        return self.evidence.get(key)
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "evidence": self.evidence,
            "timestamp": self.timestamp
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationEvidence':
        """Create from dictionary"""
        evidence = cls()
        evidence.evidence = data["evidence"]
        evidence.timestamp = data["timestamp"]
        return evidence

class ValidationStatus(str, Enum):
    """Status of a validation"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ValidationPriority(str, Enum):
    """Priority levels for validations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ValidationType(str, Enum):
    """Type of validation"""
    IMPORT = "import"
    RUNTIME = "runtime"
    SAFETY = "safety"
    BETA = "beta"

class ValidationScope(str, Enum):
    """Scope of validation"""
    FILE = "file"
    MODULE = "module"
    PACKAGE = "package"
    SYSTEM = "system"

class Validation:
    """Validation model for tracking and managing validations"""
    
    def __init__(self):
        self.current_time = datetime.utcnow().isoformat()
        self.framework = UnifiedValidationFramework()
        
    def create_validation(
        self,
        name: str,
        type: str,
        priority: ValidationPriority,
        requirements: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a new validation"""
        validation = {
            "id": f"VAL-{name}-{self.current_time}",
            "name": name,
            "type": type,
            "priority": priority,
            "status": ValidationStatus.PENDING,
            "requirements": requirements or {},
            "metadata": metadata or {},
            "created_at": self.current_time,
            "updated_at": self.current_time
        }
        
        # Register with unified framework
        self.framework.register_validation(validation)
        
        return validation
        
    def update_validation_status(
        self,
        validation: Dict,
        status: ValidationStatus,
        message: Optional[str] = None
    ) -> Dict:
        """Update validation status"""
        validation["status"] = status
        validation["updated_at"] = datetime.utcnow().isoformat()
        
        if message:
            if "messages" not in validation:
                validation["messages"] = []
            validation["messages"].append({
                "text": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        # Update in unified framework
        self.framework.update_validation(validation)
        
        return validation
        
    def check_validation_requirements(
        self,
        validation: Dict
    ) -> bool:
        """Check if validation requirements are met"""
        return self.framework.validate({
            "validation_id": validation["id"],
            "requirements": validation["requirements"]
        })
