"""Medication repository implementation."""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from ...domain.medication.entities import Medication
from ...domain.medication.repositories import MedicationRepository
from ..database.models import Medication as MedicationModel
from ..mappers.medication_mapper import MedicationMapper
from ...security.sql_security import secure_query_wrapper

logger = logging.getLogger(__name__)

class SQLMedicationRepository(MedicationRepository):
    """SQL implementation of the medication repository."""
    
    def __init__(self, db: Session):
        self.db = db
        self.mapper = MedicationMapper()

    @secure_query_wrapper
    def get_by_id(self, medication_id: int) -> Optional[Medication]:
        """Get medication by ID with SQL injection protection."""
        try:
            medication_model = self.db.query(MedicationModel).filter(
                MedicationModel.id == medication_id
            ).first()
            return self.mapper.to_entity(medication_model) if medication_model else None
        except Exception as e:
            logger.error(f"Error getting medication by ID: {str(e)}")
            raise

    @secure_query_wrapper
    def get_by_user_id(self, user_id: int) -> List[Medication]:
        """Get medications by user ID with SQL injection protection."""
        try:
            medication_models = self.db.query(MedicationModel).filter(
                MedicationModel.user_id == user_id
            ).all()
            return [self.mapper.to_entity(model) for model in medication_models]
        except Exception as e:
            logger.error(f"Error getting medications by user ID: {str(e)}")
            raise

    @secure_query_wrapper
    def save(self, medication: Medication) -> Medication:
        """Save medication with SQL injection protection."""
        try:
            medication_model = self.mapper.to_model(medication)
            if medication_model.id:
                self.db.merge(medication_model)
            else:
                self.db.add(medication_model)
            self.db.commit()
            self.db.refresh(medication_model)
            return self.mapper.to_entity(medication_model)
        except Exception as e:
            logger.error(f"Error saving medication: {str(e)}")
            self.db.rollback()
            raise

    @secure_query_wrapper
    def update(self, medication: Medication) -> Medication:
        """Update medication with SQL injection protection."""
        try:
            medication_model = self.mapper.to_model(medication)
            self.db.merge(medication_model)
            self.db.commit()
            self.db.refresh(medication_model)
            return self.mapper.to_entity(medication_model)
        except Exception as e:
            logger.error(f"Error updating medication: {str(e)}")
            self.db.rollback()
            raise

    @secure_query_wrapper
    def delete(self, medication_id: int) -> bool:
        """Delete medication with SQL injection protection."""
        try:
            result = self.db.query(MedicationModel).filter(
                MedicationModel.id == medication_id
            ).delete()
            self.db.commit()
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting medication: {str(e)}")
            self.db.rollback()
            raise

    @secure_query_wrapper
    def get_due_medications(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[Medication]:
        """Get due medications with SQL injection protection."""
        try:
            # Use parameterized query
            query = text("""
                SELECT m.* FROM medications m
                JOIN schedules s ON m.id = s.medication_id
                WHERE s.dose_time BETWEEN :start_time AND :end_time
            """)
            
            result = self.db.execute(
                query,
                {
                    "start_time": start_time,
                    "end_time": end_time
                }
            )
            
            medication_models = [
                MedicationModel(**row) for row in result
            ]
            return [
                self.mapper.to_entity(model)
                for model in medication_models
            ]
        except Exception as e:
            logger.error(f"Error getting due medications: {str(e)}")
            raise

    def sync_user_medications(self, user_id: int) -> None:
        """
        Synchronize medication data for a specific user.
        
        This method should implement the actual synchronization logic,
        such as:
        - Updating medication schedules
        - Recalculating doses
        - Checking for conflicts
        - Updating medication status
        
        Args:
            user_id: ID of the user whose medications need to be synced
        """
        medications = self.db.query(MedicationModel).filter(
            MedicationModel.user_id == user_id
        ).all()
        
        for medication in medications:
            try:
                # Reset daily doses if needed
                if medication.daily_doses_reset_at is None or \
                   medication.daily_doses_reset_at.date() < datetime.utcnow().date():
                    medication.daily_doses_taken = 0
                    medication.daily_doses_reset_at = datetime.utcnow()
                
                # Update medication status based on remaining doses
                if medication.remaining_doses is not None and medication.remaining_doses <= 0:
                    # TODO: Generate notification for refill
                    pass
                
                # TODO: Add more sync logic as needed:
                # - Check for schedule conflicts
                # - Update PRN medication windows
                # - Calculate next dose times
                # - etc.
                
            except Exception as e:
                logger.error(f"Error syncing medication {medication.id}: {str(e)}")
                raise
        
        self.db.commit()
