"""
Schedule Routes
Last Updated: 2024-12-25T20:28:37+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md

This module implements critical path requirements for schedule endpoints:
1. Data Safety: Request validation
2. User Safety: Time validation
3. System Stability: Error handling
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.services.schedule_service import ScheduleService
from app.validation import DataValidator, SafetyChecker
from app.database import get_session

# Critical Path: Route Configuration
bp = Blueprint('schedule', __name__)
logger = logging.getLogger(__name__)
service = ScheduleService()

@bp.before_request
def validate_request():
    """
    Validate all requests per critical path.
    Critical Path: Request Safety
    """
    try:
        if request.is_json and request.get_json():
            DataValidator.validate_schedule_data(request.get_json())
        logger.info(f"Schedule request validated at {datetime.utcnow()}")
    except Exception as e:
        logger.error(f"Schedule request validation failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/schedules', methods=['POST'])
def create_schedule():
    """
    Create schedule with validation.
    Critical Path: Schedule Safety
    """
    try:
        data = request.get_json()
        with get_session() as session:
            result = service.create_schedule(data, session)
        logger.info(f"Schedule created at {datetime.utcnow()}")
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Schedule creation failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/schedules/<int:schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    """
    Get schedule with validation.
    Critical Path: Data Safety
    """
    try:
        with get_session() as session:
            result = service.get_schedule(schedule_id, session)
        logger.info(f"Schedule retrieved at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Schedule retrieval failed: {str(e)}")
        return jsonify({"error": str(e)}), 404

@bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    """
    Update schedule with validation.
    Critical Path: Schedule Safety
    """
    try:
        data = request.get_json()
        with get_session() as session:
            result = service.update_schedule(schedule_id, data, session)
        logger.info(f"Schedule updated at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Schedule update failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """
    Delete schedule with validation.
    Critical Path: Data Safety
    """
    try:
        with get_session() as session:
            result = service.delete_schedule(schedule_id, session)
        logger.info(f"Schedule deleted at {datetime.utcnow()}")
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error(f"Schedule deletion failed: {str(e)}")
        return jsonify({"error": str(e)}), 404

@bp.route('/schedules', methods=['GET'])
def list_schedules():
    """
    List schedules with validation.
    Critical Path: Data Safety
    """
    try:
        user_id = request.args.get('user_id', type=int)
        if not user_id:
            raise ValueError("User ID required")
            
        with get_session() as session:
            result = service.list_user_schedules(user_id, session)
        logger.info(f"Schedules listed at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Schedule listing failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/schedules/<int:schedule_id>/taken', methods=['POST'])
def record_taken(schedule_id):
    """
    Record medication taken with validation.
    Critical Path: User Safety
    """
    try:
        with get_session() as session:
            result = service.record_medication_taken(schedule_id, session)
        logger.info(f"Medication taken recorded at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Recording medication taken failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/schedules/conflicts', methods=['GET'])
def check_conflicts():
    """
    Check schedule conflicts with validation.
    Critical Path: Schedule Safety
    """
    try:
        user_id = request.args.get('user_id', type=int)
        time_str = request.args.get('time', type=str)
        
        if not user_id or not time_str:
            raise ValueError("User ID and time required")
            
        # Convert time string to time object
        time_parts = time_str.split(':')
        time_obj = datetime.strptime(f"{time_parts[0]}:{time_parts[1]}", "%H:%M").time()
        
        with get_session() as session:
            has_conflict = service.check_schedule_conflicts(user_id, time_obj, session)
        
        logger.info(f"Schedule conflict check at {datetime.utcnow()}")
        return jsonify({"has_conflict": has_conflict}), 200
    except Exception as e:
        logger.error(f"Schedule conflict check failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.errorhandler(Exception)
def handle_error(error):
    """
    Handle errors per critical path.
    Critical Path: Error Safety
    """
    logger.error(f"Schedule route error: {str(error)}")
    return jsonify({"error": str(error)}), 500
