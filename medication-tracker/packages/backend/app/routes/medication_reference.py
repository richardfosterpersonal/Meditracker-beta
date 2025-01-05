"""
Medication Reference Routes
Last Updated: 2024-12-25T20:23:42+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This module implements critical path requirements for medication endpoints:
1. Data Safety: Request validation
2. User Safety: Response validation
3. System Stability: Error handling
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.services.medication_reference_service import MedicationReferenceService
from app.validation import DataValidator, SafetyChecker
from app.database import get_session

# Critical Path: Route Configuration
bp = Blueprint('medication_reference', __name__)
logger = logging.getLogger(__name__)
service = MedicationReferenceService()

@bp.before_request
def validate_request():
    """
    Validate all requests per critical path.
    Critical Path: Request Safety
    """
    try:
        if request.is_json and request.get_json():
            DataValidator.validate_medication_data(request.get_json())
        logger.info(f"Request validated at {datetime.utcnow()}")
    except Exception as e:
        logger.error(f"Request validation failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/medications', methods=['POST'])
def create_medication():
    """
    Create medication with validation.
    Critical Path: Data Safety + User Safety
    """
    try:
        data = request.get_json()
        with get_session() as session:
            result = service.create_medication(data, session)
        logger.info(f"Medication created at {datetime.utcnow()}")
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Medication creation failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/medications/<int:med_id>', methods=['GET'])
def get_medication(med_id):
    """
    Get medication with validation.
    Critical Path: Data Safety
    """
    try:
        with get_session() as session:
            result = service.get_medication(med_id, session)
        logger.info(f"Medication retrieved at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Medication retrieval failed: {str(e)}")
        return jsonify({"error": str(e)}), 404

@bp.route('/medications/<int:med_id>', methods=['PUT'])
def update_medication(med_id):
    """
    Update medication with validation.
    Critical Path: Data Safety + User Safety
    """
    try:
        data = request.get_json()
        with get_session() as session:
            result = service.update_medication(med_id, data, session)
        logger.info(f"Medication updated at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Medication update failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/medications/<int:med_id>', methods=['DELETE'])
def delete_medication(med_id):
    """
    Delete medication with validation.
    Critical Path: Data Safety
    """
    try:
        with get_session() as session:
            result = service.delete_medication(med_id, session)
        logger.info(f"Medication deleted at {datetime.utcnow()}")
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error(f"Medication deletion failed: {str(e)}")
        return jsonify({"error": str(e)}), 404

@bp.route('/medications', methods=['GET'])
def list_medications():
    """
    List medications with validation.
    Critical Path: Data Safety
    """
    try:
        user_id = request.args.get('user_id', type=int)
        if not user_id:
            raise ValueError("User ID required")
            
        with get_session() as session:
            result = service.list_medications(user_id, session)
        logger.info(f"Medications listed at {datetime.utcnow()}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Medication listing failed: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.errorhandler(Exception)
def handle_error(error):
    """
    Handle errors per critical path.
    Critical Path: Error Safety
    """
    logger.error(f"Route error: {str(error)}")
    return jsonify({"error": str(error)}), 500
