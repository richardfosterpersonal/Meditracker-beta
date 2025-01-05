"""
Medication Reference Service
Last Updated: 2024-12-25T20:21:25+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This service implements critical path requirements for medication management:
1. Data Safety: Medication reference validation
2. User Safety: Interaction checks
3. System Stability: Error handling
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.custom_medication import CustomMedication
from app.validation import DataValidator, SafetyChecker
from app.database import get_session

class MedicationReferenceService:
    """
    Medication Reference Service
    Critical Path: Core Service Implementation
    """
    
    def __init__(self):
        """Initialize with validation."""
        self.logger = logging.getLogger(__name__)
        self.validator = DataValidator()
        self.safety = SafetyChecker()
        
    def get_medication(self, med_id: int, session: Optional[Session] = None) -> Dict:
        """
        Get medication with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            med = session.query(CustomMedication).filter_by(id=med_id).first()
            if not med:
                self.logger.error(f"Medication {med_id} not found")
                raise ValueError("Medication not found")
            return med.to_dict()
        except Exception as e:
            self.logger.error(f"Error getting medication: {str(e)}")
            raise
            
    def create_medication(self, data: Dict, session: Optional[Session] = None) -> Dict:
        """
        Create medication with validation.
        Critical Path: Data Safety + User Safety
        """
        try:
            # Critical Path: Validation
            self.validator.validate_medication_data(data)
            self.safety.check_medication_safety(data)
            
            session = session or get_session()
            med = CustomMedication(**data)
            session.add(med)
            session.commit()
            
            self.logger.info(f"Created medication at {datetime.utcnow()}")
            return med.to_dict()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error creating medication: {str(e)}")
            raise
            
    def update_medication(self, med_id: int, data: Dict, session: Optional[Session] = None) -> Dict:
        """
        Update medication with validation.
        Critical Path: Data Safety + User Safety
        """
        try:
            # Critical Path: Validation
            self.validator.validate_medication_data(data)
            self.safety.check_medication_safety(data)
            
            session = session or get_session()
            med = session.query(CustomMedication).filter_by(id=med_id).first()
            if not med:
                raise ValueError("Medication not found")
                
            med.update(**data)
            session.commit()
            
            self.logger.info(f"Updated medication at {datetime.utcnow()}")
            return med.to_dict()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error updating medication: {str(e)}")
            raise
            
    def delete_medication(self, med_id: int, session: Optional[Session] = None) -> bool:
        """
        Delete medication with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            med = session.query(CustomMedication).filter_by(id=med_id).first()
            if not med:
                raise ValueError("Medication not found")
                
            session.delete(med)
            session.commit()
            
            self.logger.info(f"Deleted medication at {datetime.utcnow()}")
            return True
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error deleting medication: {str(e)}")
            raise
            
    def list_medications(self, user_id: int, session: Optional[Session] = None) -> List[Dict]:
        """
        List medications with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            meds = session.query(CustomMedication).filter_by(user_id=user_id).all()
            return [med.to_dict() for med in meds]
        except Exception as e:
            self.logger.error(f"Error listing medications: {str(e)}")
            raise
