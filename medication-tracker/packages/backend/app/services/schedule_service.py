"""
Schedule Service
Last Updated: 2024-12-25T20:27:24+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md

This service implements critical path requirements for schedule management:
1. Data Safety: Schedule validation
2. User Safety: Timing validation
3. System Stability: Conflict prevention
"""

import logging
from datetime import datetime, time
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.medication_schedule import MedicationSchedule
from app.validation import DataValidator, SafetyChecker
from app.database import get_session

class ScheduleService:
    """
    Schedule Management Service
    Critical Path: Core Schedule Management
    """
    
    def __init__(self):
        """Initialize with validation."""
        self.logger = logging.getLogger(__name__)
        self.validator = DataValidator()
        self.safety = SafetyChecker()
    
    def create_schedule(self, data: Dict, session: Optional[Session] = None) -> Dict:
        """
        Create schedule with validation.
        Critical Path: Schedule Safety
        """
        try:
            # Critical Path: Data Validation
            self.validator.validate_schedule_data(data)
            self.safety.check_schedule_safety(data)
            
            session = session or get_session()
            schedule = MedicationSchedule(**data)
            session.add(schedule)
            session.commit()
            
            self.logger.info(f"Created schedule at {datetime.utcnow()}")
            return schedule.to_dict()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error creating schedule: {str(e)}")
            raise
    
    def get_schedule(self, schedule_id: int, session: Optional[Session] = None) -> Dict:
        """
        Get schedule with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            schedule = session.query(MedicationSchedule).filter_by(id=schedule_id).first()
            if not schedule:
                raise ValueError("Schedule not found")
                
            return schedule.to_dict()
        except Exception as e:
            self.logger.error(f"Error getting schedule: {str(e)}")
            raise
    
    def update_schedule(self, schedule_id: int, data: Dict, session: Optional[Session] = None) -> Dict:
        """
        Update schedule with validation.
        Critical Path: Schedule Safety
        """
        try:
            # Critical Path: Data Validation
            self.validator.validate_schedule_data(data)
            self.safety.check_schedule_safety(data)
            
            session = session or get_session()
            schedule = session.query(MedicationSchedule).filter_by(id=schedule_id).first()
            if not schedule:
                raise ValueError("Schedule not found")
                
            schedule.update(**data)
            session.commit()
            
            self.logger.info(f"Updated schedule at {datetime.utcnow()}")
            return schedule.to_dict()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error updating schedule: {str(e)}")
            raise
    
    def delete_schedule(self, schedule_id: int, session: Optional[Session] = None) -> bool:
        """
        Delete schedule with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            schedule = session.query(MedicationSchedule).filter_by(id=schedule_id).first()
            if not schedule:
                raise ValueError("Schedule not found")
                
            session.delete(schedule)
            session.commit()
            
            self.logger.info(f"Deleted schedule at {datetime.utcnow()}")
            return True
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error deleting schedule: {str(e)}")
            raise
    
    def list_user_schedules(self, user_id: int, session: Optional[Session] = None) -> List[Dict]:
        """
        List user schedules with validation.
        Critical Path: Data Safety
        """
        try:
            session = session or get_session()
            schedules = session.query(MedicationSchedule).filter_by(user_id=user_id).all()
            return [schedule.to_dict() for schedule in schedules]
        except Exception as e:
            self.logger.error(f"Error listing schedules: {str(e)}")
            raise
    
    def record_medication_taken(self, schedule_id: int, session: Optional[Session] = None) -> Dict:
        """
        Record medication taken with validation.
        Critical Path: User Safety
        """
        try:
            session = session or get_session()
            schedule = session.query(MedicationSchedule).filter_by(id=schedule_id).first()
            if not schedule:
                raise ValueError("Schedule not found")
                
            schedule.record_taken()
            session.commit()
            
            self.logger.info(f"Recorded medication taken at {datetime.utcnow()}")
            return schedule.to_dict()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Error recording medication taken: {str(e)}")
            raise
    
    def check_schedule_conflicts(self, user_id: int, time_slot: time, session: Optional[Session] = None) -> bool:
        """
        Check schedule conflicts with validation.
        Critical Path: Schedule Safety
        """
        try:
            session = session or get_session()
            existing = session.query(MedicationSchedule)\
                .filter_by(user_id=user_id)\
                .filter_by(time=time_slot)\
                .first()
                
            return existing is not None
        except Exception as e:
            self.logger.error(f"Error checking schedule conflicts: {str(e)}")
            raise
