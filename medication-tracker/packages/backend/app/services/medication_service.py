"""
Medication Service for Medication Tracker
Last Updated: 2024-12-24T23:14:13+01:00

Critical Path: Medication.Core
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, time
from sqlalchemy.orm import Session
from prometheus_client import Counter, Histogram

from app.core.monitoring import monitor, track_timing, log_error
from app.models.medication import Medication
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationInDB
from app.services.audit_service import AuditService

# Medication Metrics
medication_events = Counter(
    'medication_events_total',
    'Total number of medication events',
    ['event_type', 'status']
)

medication_timing = Histogram(
    'medication_operation_duration_seconds',
    'Duration of medication operations',
    ['operation']
)

class MedicationService:
    """
    Service for managing medications
    Critical Path: Medication.Management
    """
    
    def __init__(self, db_session: Session):
        """Initialize medication service"""
        self.db = db_session
        self.audit_service = AuditService()
        
    def _to_entity(self, model: Medication) -> MedicationInDB:
        """Convert a Medication to a MedicationEntity"""
        with PerformanceMonitor.track_operation('medication_entity_conversion'):
            try:
                dosage = Dosage(
                    amount=model.dosage.get('amount', ''),
                    unit=model.dosage.get('unit', ''),
                    frequency=model.dosage.get('frequency', ''),
                    times_per_day=model.dosage.get('times_per_day', 1),
                    specific_times=model.dosage.get('specific_times', [])
                )
                
                schedule = Schedule(
                    start_date=datetime.fromisoformat(model.schedule.get('start_date')) if model.schedule.get('start_date') else model.created_at,
                    end_date=datetime.fromisoformat(model.schedule.get('end_date')) if model.schedule.get('end_date') else None,
                    reminder_time=model.schedule.get('reminder_time', 30),
                    dose_times=model.schedule.get('dose_times', []),
                    timezone=model.schedule.get('timezone', 'UTC')
                )
                
                return MedicationInDB(
                    name=model.name,
                    dosage=dosage,
                    schedule=schedule,
                    user_id=model.user_id,
                    instructions=model.instructions
                )
            except Exception as e:
                logger.log(
                    level=logging.ERROR,
                    message=f"Error converting medication entity: {str(e)}",
                    extra={'medication_id': model.id}
                )
                MetricsCollector.track_error(
                    operation='medication_entity_conversion',
                    error_type=type(e).__name__
                )
                raise

    @monitor(metric=medication_events)
    @track_timing("get_medication")
    def get_medication(self, medication_id: int) -> Optional[MedicationInDB]:
        """Retrieve a medication by its ID."""
        try:
            medication = self.db.query(Medication).filter(Medication.id == medication_id).first()
            if medication:
                logger.log(
                    level=logging.INFO,
                    message=f"Retrieved medication",
                    extra={'medication_id': medication_id}
                )
                return self._to_entity(medication)
            return None
        except Exception as e:
            logger.log(
                level=logging.ERROR,
                message=f"Error retrieving medication: {str(e)}",
                extra={'medication_id': medication_id}
            )
            MetricsCollector.track_error(
                operation='get_medication',
                error_type=type(e).__name__
            )
            raise

    @monitor(metric=medication_events)
    @track_timing("get_user_medications")
    def get_user_medications(self, user_id: int) -> List[MedicationInDB]:
        """Retrieve all medications for a user."""
        try:
            medications = self.db.query(Medication).filter(Medication.user_id == user_id).all()
            logger.log(
                level=logging.INFO,
                message=f"Retrieved medications for user",
                extra={'user_id': user_id, 'count': len(medications)}
            )
            return [self._to_entity(med) for med in medications]
        except Exception as e:
            logger.log(
                level=logging.ERROR,
                message=f"Error retrieving user medications: {str(e)}",
                extra={'user_id': user_id}
            )
            MetricsCollector.track_error(
                operation='get_user_medications',
                error_type=type(e).__name__
            )
            raise

    @monitor(metric=medication_events)
    @track_timing("create_medication")
    def create_medication(self, user_id: int, medication_data: MedicationCreate) -> MedicationInDB:
        """Create a new medication."""
        # Validate required fields
        if not medication_data.name:
            raise ValueError("Medication name is required")
        if not medication_data.dosage.amount:
            raise ValueError("Medication dosage amount is required")
        
        # Validate date range if end_date is provided
        if (medication_data.schedule.end_date and medication_data.schedule.start_date and 
            medication_data.schedule.end_date < medication_data.schedule.start_date):
            raise ValueError("End date cannot be before start date")

        medication = Medication(
            user_id=user_id,
            name=medication_data.name,
            dosage={
                "amount": medication_data.dosage.amount,
                "unit": medication_data.dosage.unit,
                "frequency": medication_data.dosage.frequency,
                "times_per_day": medication_data.dosage.times_per_day,
                "specific_times": medication_data.dosage.specific_times
            },
            schedule={
                "start_date": medication_data.schedule.start_date.isoformat(),
                "end_date": medication_data.schedule.end_date.isoformat() if medication_data.schedule.end_date else None,
                "reminder_time": medication_data.schedule.reminder_time,
                "dose_times": medication_data.schedule.dose_times,
                "timezone": medication_data.schedule.timezone
            },
            instructions=medication_data.instructions,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        try:
            self.db.add(medication)
            self.db.commit()
            
            logger.log(
                level=logging.INFO,
                message=f"Created medication",
                extra={'medication_id': medication.id}
            )
            self.audit_service.log_event(
                "create_medication",
                {
                    "user_id": user_id,
                    "medication_id": medication.id
                }
            )
            
            return self._to_entity(medication)
        except Exception as e:
            self.db.rollback()
            logger.log(
                level=logging.ERROR,
                message=f"Error creating medication: {str(e)}",
                extra={'user_id': user_id}
            )
            MetricsCollector.track_error(
                operation='create_medication',
                error_type=type(e).__name__
            )
            raise

    @monitor(metric=medication_events)
    @track_timing("update_medication")
    def update_medication(self, medication_id: int, medication_data: MedicationUpdate) -> Optional[MedicationInDB]:
        """Update an existing medication."""
        medication = self.db.query(Medication).filter(Medication.id == medication_id).first()
        if not medication:
            return None

        # Update fields that are provided
        if medication_data.name:
            medication.name = medication_data.name
        if medication_data.dosage:
            medication.dosage = {
                "amount": medication_data.dosage.amount,
                "unit": medication_data.dosage.unit,
                "frequency": medication_data.dosage.frequency,
                "times_per_day": medication_data.dosage.times_per_day,
                "specific_times": medication_data.dosage.specific_times
            }
        if medication_data.schedule:
            medication.schedule = {
                "start_date": medication_data.schedule.start_date.isoformat(),
                "end_date": medication_data.schedule.end_date.isoformat() if medication_data.schedule.end_date else None,
                "reminder_time": medication_data.schedule.reminder_time,
                "dose_times": medication_data.schedule.dose_times,
                "timezone": medication_data.schedule.timezone
            }
        if medication_data.instructions:
            medication.instructions = medication_data.instructions
        
        # Validate date range if both dates are present
        if (medication_data.schedule.end_date and medication_data.schedule.start_date and 
            medication_data.schedule.end_date < medication_data.schedule.start_date):
            raise ValueError("End date cannot be before start date")
        
        medication.updated_at = datetime.now(timezone.utc)
        
        try:
            self.db.commit()
            
            logger.log(
                level=logging.INFO,
                message=f"Updated medication",
                extra={'medication_id': medication_id}
            )
            self.audit_service.log_event(
                "update_medication",
                {
                    "user_id": medication.user_id,
                    "medication_id": medication_id
                }
            )
            
            return self._to_entity(medication)
        except Exception as e:
            self.db.rollback()
            logger.log(
                level=logging.ERROR,
                message=f"Error updating medication: {str(e)}",
                extra={'medication_id': medication_id}
            )
            MetricsCollector.track_error(
                operation='update_medication',
                error_type=type(e).__name__
            )
            raise

    @monitor(metric=medication_events)
    @track_timing("delete_medication")
    def delete_medication(self, medication_id: int) -> bool:
        """Delete a medication."""
        medication = self.db.query(Medication).filter(Medication.id == medication_id).first()
        if not medication:
            return False
        
        try:
            self.db.delete(medication)
            self.db.commit()
            
            logger.log(
                level=logging.INFO,
                message=f"Deleted medication",
                extra={'medication_id': medication_id}
            )
            self.audit_service.log_event(
                "delete_medication",
                {
                    "user_id": medication.user_id,
                    "medication_id": medication_id
                }
            )
            
            return True
        except Exception as e:
            self.db.rollback()
            logger.log(
                level=logging.ERROR,
                message=f"Error deleting medication: {str(e)}",
                extra={'medication_id': medication_id}
            )
            MetricsCollector.track_error(
                operation='delete_medication',
                error_type=type(e).__name__
            )
            raise