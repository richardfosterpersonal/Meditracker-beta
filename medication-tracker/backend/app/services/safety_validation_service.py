"""
Safety Validation Service
Critical Path: VALIDATION-SERVICES
Last Updated: 2025-01-02T14:13:50+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime

from ..core.unified_validation_framework import UnifiedValidationFramework
from ..models.validation import ValidationStatus, ValidationPriority

class SafetyValidationService:
    """Service for medication safety validation"""
    
    def __init__(self):
        self.framework = UnifiedValidationFramework()
        
    def validate_medication_safety(
        self,
        medication: Dict,
        patient_history: Optional[Dict] = None
    ) -> Dict:
        """Validate medication safety for a patient"""
        context = {
            "type": "medication_safety",
            "medication": medication,
            "patient_history": patient_history or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            result = self.framework.validate(context)
            return {
                "valid": result.get("valid", False),
                "issues": result.get("issues", []),
                "warnings": result.get("warnings", []),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    def get_safety_validations(
        self,
        medication_id: Optional[str] = None
    ) -> List[Dict]:
        """Get safety validations for a medication"""
        try:
            validations = self.framework.get_validations()
            
            if medication_id:
                validations = [
                    v for v in validations
                    if v.get("metadata", {}).get("medication_id") == medication_id
                ]
                
            return validations
        except Exception as e:
            return []
