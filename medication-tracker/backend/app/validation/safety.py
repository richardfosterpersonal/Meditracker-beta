"""
Safety Validation Module
Critical Path: VALIDATION-SAFETY
Last Updated: 2025-01-02T14:13:50+01:00
"""

from datetime import datetime
from typing import Dict, List, Optional

from ..core.unified_validation_framework import UnifiedValidationFramework
from ..models.validation import ValidationStatus, ValidationPriority

class SafetyValidation:
    """Safety validation implementation"""
    
    def __init__(self):
        self.framework = UnifiedValidationFramework()
        self._register_safety_patterns()
        
    def _register_safety_patterns(self):
        """Register core safety validation patterns"""
        patterns = [
            {
                "id": "dosage_safety",
                "name": "Dosage Safety Check",
                "type": "medication_safety",
                "priority": ValidationPriority.CRITICAL,
                "rules": {
                    "max_daily_dose": True,
                    "min_interval": True,
                    "max_single_dose": True
                }
            },
            {
                "id": "interaction_safety",
                "name": "Interaction Safety Check",
                "type": "medication_safety",
                "priority": ValidationPriority.CRITICAL,
                "rules": {
                    "drug_interactions": True,
                    "food_interactions": True,
                    "condition_interactions": True
                }
            },
            {
                "id": "schedule_safety",
                "name": "Schedule Safety Check",
                "type": "medication_safety",
                "priority": ValidationPriority.HIGH,
                "rules": {
                    "timing_conflicts": True,
                    "missed_doses": True,
                    "schedule_adherence": True
                }
            }
        ]
        
        for pattern in patterns:
            self.framework.register_pattern(pattern)
            
    def validate_medication(
        self,
        medication: Dict,
        patient_history: Optional[Dict] = None,
        schedule: Optional[Dict] = None
    ) -> Dict:
        """Validate medication safety"""
        context = {
            "medication": medication,
            "patient_history": patient_history or {},
            "schedule": schedule or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            result = self.framework.validate(context)
            return {
                "valid": result.get("valid", False),
                "issues": result.get("issues", []),
                "warnings": result.get("warnings", []),
                "patterns": result.get("patterns", []),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    def get_safety_history(
        self,
        medication_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> List[Dict]:
        """Get safety validation history"""
        try:
            validations = self.framework.get_validations()
            
            if medication_id:
                validations = [
                    v for v in validations
                    if v.get("metadata", {}).get("medication_id") == medication_id
                ]
                
            if patient_id:
                validations = [
                    v for v in validations
                    if v.get("metadata", {}).get("patient_id") == patient_id
                ]
                
            return validations
        except Exception as e:
            return []
