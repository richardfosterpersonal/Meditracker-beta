"""
Medication Validation Service
Critical Path: MEDICATION-VALIDATION-SERVICE
Last Updated: 2025-01-02T13:24:38+01:00

Validates medication safety using unified validation framework.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

from ..core.unified_validation_framework import UnifiedValidationFramework
from ..core.unified_decorator import unified_validation
from ..core.exceptions import ValidationError
from ..core.logging import medication_logger

class MedicationValidationService:
    """Medication validation service using unified framework"""
    
    def __init__(self):
        self.unified_framework = UnifiedValidationFramework()
        self.logger = medication_logger
        
        # Common dosage patterns for different medications
        self.common_dosages = {
            "tablets": ["1mg", "2mg", "5mg", "10mg", "20mg", "25mg", "50mg", "100mg", "200mg", "500mg"],
            "liquids": ["1ml", "2ml", "5ml", "10ml", "15ml", "20ml", "25ml", "30ml"],
            "injections": ["0.25ml", "0.5ml", "1ml", "2ml", "5ml"],
            "inhalers": ["1 puff", "2 puffs"],
            "patches": ["1 patch"],
            "sachets": ["1 sachet"],
        }
        
        # Maximum safe frequencies for different time periods
        self.max_frequencies = {
            "minute": 1,  # Max 1 dose per minute
            "15_minutes": 4,  # Max 4 doses per hour
            "30_minutes": 2,  # Max 2 doses per hour
            "hourly": 24,  # Max 24 doses per day
            "daily": 6,  # Max 6 times per day for regular medications
            "weekly": 7,  # Max 7 doses per week
        }
        
    @unified_validation(critical_path="Medication.Safety", validation_layer="Domain")
    async def validate_medication(self, medication: Dict[str, Any]) -> Dict[str, Any]:
        """Validate medication safety"""
        try:
            validation_result = await self.unified_framework.validate_critical_path(
                "Medication Safety",
                context={
                    "medication": medication,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
            
            if not validation_result["valid"]:
                raise ValidationError(
                    f"Medication safety validation failed: {validation_result['error']}",
                    details=validation_result.get("details")
                )
                
            return validation_result
            
        except Exception as e:
            self.logger.error(
                f"Failed to validate medication: {str(e)}",
                extra={
                    "medication": medication,
                    "error": str(e)
                }
            )
            raise
            
    @unified_validation(critical_path="Medication.Interaction", validation_layer="Domain")
    async def validate_interaction(self, medications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate medication interactions"""
        try:
            validation_result = await self.unified_framework.validate_critical_path(
                "Medication Interaction",
                context={
                    "medications": medications,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
            
            if not validation_result["valid"]:
                raise ValidationError(
                    f"Medication interaction validation failed: {validation_result['error']}",
                    details=validation_result.get("details")
                )
                
            return validation_result
            
        except Exception as e:
            self.logger.error(
                f"Failed to validate medication interaction: {str(e)}",
                extra={
                    "medications": medications,
                    "error": str(e)
                }
            )
            raise
            
    @unified_validation(critical_path="Medication.Schedule", validation_layer="Domain")
    async def validate_schedule(self, schedule: Dict[str, Any]) -> Dict[str, Any]:
        """Validate medication schedule"""
        try:
            validation_result = await self.unified_framework.validate_critical_path(
                "Medication Schedule",
                context={
                    "schedule": schedule,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
            
            if not validation_result["valid"]:
                raise ValidationError(
                    f"Medication schedule validation failed: {validation_result['error']}",
                    details=validation_result.get("details")
                )
                
            return validation_result
            
        except Exception as e:
            self.logger.error(
                f"Failed to validate medication schedule: {str(e)}",
                extra={
                    "schedule": schedule,
                    "error": str(e)
                }
            )
            raise
