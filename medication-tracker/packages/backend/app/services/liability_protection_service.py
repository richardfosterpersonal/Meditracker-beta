from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
from app.models.medication import Medication
from app.models.custom_medication import CustomMedication

# Initialize logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LiabilityProtectionService:
    """Service for managing liability protection and safety checks"""

    def __init__(self):
        self.required_disclaimers = {
            'general': (
                "This app is for medication tracking purposes only and should not "
                "be used as a substitute for professional medical advice."
            ),
            'custom_medication': (
                "You are entering a custom medication. Please verify all details "
                "with your healthcare provider."
            ),
            'high_risk': (
                "This medication requires special attention. Always follow your "
                "healthcare provider's instructions carefully."
            )
        }

        # Define high-risk scenarios that require additional verification
        self.high_risk_scenarios = {
            'multiple_daily_doses': {
                'threshold': 4,  # More than 4 doses per day
                'warning': "Multiple daily doses detected. Please verify schedule."
            },
            'similar_medications': {
                'warning': "Similar medications detected. Check for duplicates."
            },
            'interaction_risk': {
                'warning': "Potential interaction detected. Consult your healthcare provider."
            }
        }

    def validate_medication_entry(
        self, 
        medication: Dict,
        user_age: Optional[int] = None
    ) -> Dict:
        """
        Validate medication entry and return required safety measures
        """
        safety_measures = {
            'requires_verification': False,
            'warnings': [],
            'disclaimers': [self.required_disclaimers['general']],
            'confirmation_required': False
        }

        # Age-specific validations
        if user_age:
            if user_age >= 65:
                safety_measures['warnings'].append(
                    "Please ensure medication is appropriate for elderly patients"
                )
            elif user_age <= 18:
                safety_measures['warnings'].append(
                    "Please ensure medication is appropriate for minors"
                )
                safety_measures['requires_verification'] = True

        # Custom medication checks
        if medication.get('is_custom'):
            safety_measures['disclaimers'].append(
                self.required_disclaimers['custom_medication']
            )
            safety_measures['requires_verification'] = True
            safety_measures['confirmation_required'] = True

        # Dosage frequency checks
        daily_doses = medication.get('doses_per_day', 0)
        if daily_doses > self.high_risk_scenarios['multiple_daily_doses']['threshold']:
            safety_measures['warnings'].append(
                self.high_risk_scenarios['multiple_daily_doses']['warning']
            )
            safety_measures['confirmation_required'] = True

        return safety_measures

    def generate_safety_acknowledgment(
        self,
        medication: Dict,
        safety_measures: Dict
    ) -> str:
        """
        Generate a safety acknowledgment text that user must confirm
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        
        acknowledgment = (
            f"Safety Acknowledgment for {medication.get('name')} ({medication.get('dosage')}, {medication.get('frequency')})\n"
            f"Generated on: {timestamp}\n\n"
            "I acknowledge that:\n\n"
        )

        # Add all relevant disclaimers
        for disclaimer in safety_measures['disclaimers']:
            acknowledgment += f"• {disclaimer}\n"

        # Add all warnings
        for warning in safety_measures['warnings']:
            acknowledgment += f"• {warning}\n"

        acknowledgment += (
            "\nI confirm that I have reviewed all medication details and "
            "understand the instructions provided."
        )

        return acknowledgment

    def log_safety_verification(
        self,
        medication_id: int,
        user_id: int,
        safety_measures: Dict
    ) -> None:
        """
        Log safety verification for audit purposes
        """
        try:
            if safety_measures is None:
                raise ValueError("safety_measures cannot be None")
                
            verification_data = {
                'medication_id': medication_id,
                'user_id': user_id,
                'timestamp': datetime.now(timezone.utc),
                'safety_measures': safety_measures,
            }
            
            logger.info(
                f"Safety verification logged for medication {medication_id}",
                extra=verification_data
            )
            
        except Exception as e:
            logger.error(
                f"Error logging safety verification: {str(e)}",
                extra={'medication_id': medication_id, 'user_id': user_id}
            )

    def get_simplified_instructions(
        self,
        medication: Dict,
        user_age: Optional[int] = None
    ) -> str:
        """
        Generate simplified, age-appropriate instructions
        """
        instructions = []

        # Basic information
        instructions.append(f"Take {medication.get('dosage')} {medication.get('frequency')}")

        # Time-specific instructions
        if medication.get('with_food'):
            instructions.append("Take with food")
        if medication.get('avoid_alcohol'):
            instructions.append("Do not drink alcohol while taking this medication")

        # Age-specific instructions
        if user_age:
            if user_age >= 65:
                instructions.append("If you feel dizzy, sit or lie down")
            elif user_age <= 18:
                instructions.append("A responsible adult should supervise medication intake")

        return "\n• ".join(instructions)

# Create singleton instance
liability_protection_service = LiabilityProtectionService()
