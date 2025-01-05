"""
Safety and Integrity Routes
Last Updated: 2024-12-25T20:52:40+01:00
Status: CRITICAL
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This module implements critical safety endpoints:
1. Medication safety validation
2. Schedule verification
3. Data integrity checks
"""

from flask import Blueprint, request, jsonify
from app.services.safety_validation_service import SafetyValidationService
from app.services.integrity_monitor_service import IntegrityMonitorService
from app.models.medication import Medication
from app.models.schedule import Schedule
from app.database import get_session

bp = Blueprint('safety', __name__, url_prefix='/api/safety')
safety_service = SafetyValidationService()
integrity_service = IntegrityMonitorService()

@bp.route('/validate/schedule', methods=['POST'])
def validate_schedule():
    """
    CRITICAL: Validate medication schedule safety
    Checks for conflicts and safety issues
    """
    data = request.get_json()
    
    with get_session() as session:
        medication = session.query(Medication).get(data['medication_id'])
        schedule = Schedule(**data['schedule'])
        existing_schedules = session.query(Schedule).all()

        # CRITICAL: Validate schedule safety
        safety_results = safety_service.validate_medication_schedule(
            medication,
            schedule,
            existing_schedules
        )

        return jsonify(safety_results)

@bp.route('/verify/integrity', methods=['POST'])
def verify_integrity():
    """
    CRITICAL: Verify data integrity
    Ensures data consistency and validity
    """
    data = request.get_json()
    
    with get_session() as session:
        medication = session.query(Medication).get(data['medication_id'])
        schedule = session.query(Schedule).get(data['schedule_id'])

        # CRITICAL: Verify data integrity
        integrity_results = integrity_service.verify_medication_transaction(
            medication,
            schedule
        )

        return jsonify(integrity_results)

@bp.route('/validate/dosage', methods=['POST'])
def validate_dosage():
    """
    CRITICAL: Validate medication dosage
    Ensures dosage is safe and within limits
    """
    data = request.get_json()
    
    with get_session() as session:
        medication = session.query(Medication).get(data['medication_id'])
        schedule = Schedule(**data['schedule'])

        # CRITICAL: Validate dosage safety
        safety_results = safety_service.validate_medication_schedule(
            medication,
            schedule,
            []  # No existing schedules needed for dosage check
        )

        return jsonify(safety_results)
