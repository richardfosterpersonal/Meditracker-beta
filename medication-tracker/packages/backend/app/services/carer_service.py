from app import db
from app.models.carer import Carer, CarerAssignment
from app.models.user import User
from app.services.notification_service import NotificationService
from flask import current_app
from datetime import datetime

class CarerService:
    """
    Interim carer service implementation.
    Will be refactored in Phase 2 to follow DDD principles.
    """
    def __init__(self):
        self.notification_service = NotificationService()

    def create_carer(self, user_id: int, carer_type: str) -> Carer:
        """Create a new carer profile for a user"""
        carer = Carer(
            user_id=user_id,
            type=carer_type
        )
        db.session.add(carer)
        db.session.commit()
        return carer

    def assign_carer(self, carer_id: int, patient_id: int, permissions: dict = None) -> CarerAssignment:
        """Assign a carer to a patient"""
        assignment = CarerAssignment(
            carer_id=carer_id,
            patient_id=patient_id,
            permissions=permissions if permissions else CarerAssignment.__table__.c.permissions.default.arg
        )
        db.session.add(assignment)
        db.session.commit()

        # Notify both parties
        self._notify_assignment(assignment)
        return assignment

    def get_patient_carers(self, patient_id: int) -> list:
        """Get all carers for a patient"""
        assignments = CarerAssignment.query.filter_by(
            patient_id=patient_id,
            active=True
        ).all()
        return [assignment.carer for assignment in assignments]

    def get_carer_patients(self, carer_id: int) -> list:
        """Get all patients for a carer"""
        assignments = CarerAssignment.query.filter_by(
            carer_id=carer_id,
            active=True
        ).all()
        return [assignment.patient for assignment in assignments]

    def update_permissions(self, assignment_id: int, permissions: dict) -> CarerAssignment:
        """Update carer permissions for a patient"""
        assignment = CarerAssignment.query.get(assignment_id)
        if assignment:
            assignment.permissions.update(permissions)
            assignment.updated_at = datetime.utcnow()
            db.session.commit()
        return assignment

    def remove_assignment(self, assignment_id: int) -> bool:
        """Remove a carer assignment"""
        assignment = CarerAssignment.query.get(assignment_id)
        if assignment:
            assignment.active = False
            assignment.updated_at = datetime.utcnow()
            db.session.commit()
            return True
        return False

    def _notify_assignment(self, assignment: CarerAssignment):
        """Send notifications about new carer assignments"""
        carer = User.query.get(assignment.carer.user_id)
        patient = User.query.get(assignment.patient_id)
        
        # Notify carer
        self.notification_service.send_notification(
            user_id=carer.id,
            title="New Patient Assignment",
            message=f"You have been assigned as a carer for {patient.name}",
            notification_type="carer_assignment"
        )
        
        # Notify patient
        self.notification_service.send_notification(
            user_id=patient.id,
            title="New Carer Assigned",
            message=f"{carer.name} has been assigned as your carer",
            notification_type="carer_assignment"
        )
