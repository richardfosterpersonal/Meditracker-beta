from flask import Blueprint, jsonify, request
from app.models.custom_medication import CustomMedication
from app.models.medication import Medication
from app import db
from http import HTTPStatus
import logging
from datetime import datetime
from ..core.enforcer_decorators import (
    requires_context,
    enforces_requirements,
    validates_scope,
    maintains_critical_path,
    syncs_documentation
)

bp = Blueprint('custom_medication', __name__)
logger = logging.getLogger(__name__)

@bp.route('/api/medications/custom', methods=['POST'])
@requires_context(
    component="medication_management",
    feature="medication_scheduling",
    task="implementation"
)
@enforces_requirements(
    "REQ001: HIPAA Compliance",
    "REQ002: Medication Safety",
    "REQ003: Data Integrity"
)
@validates_scope(
    component="medication_management",
    feature="medication_scheduling"
)
@maintains_critical_path("medication_scheduling")
@syncs_documentation()
def create_custom_medication():
    """Create a new custom medication entry"""
    try:
        data = request.get_json()
        
        # First create the base medication
        medication = Medication(
            name=data['name'],
            dosage=f"{data['dosageValue']} {data['customUnit'] or data['dosageUnit']}",
            frequency=data['frequency'],
            user_id=data['userId'],
            category='custom',
            instructions=data['instructions']
        )
        db.session.add(medication)
        db.session.flush()  # Get the ID without committing
        
        # Create the custom medication details
        custom_med = CustomMedication(
            medication_id=medication.id,
            custom_form=data['customForm'],
            custom_route=data.get('customRoute'),
            custom_unit=data.get('customUnit'),
            prescribed_by=data.get('prescribedBy'),
            verification_notes=data.get('verificationNotes'),
            verified_by_user=data.get('verifiedByUser', False),
            created_by=data['userId']
        )
        
        db.session.add(custom_med)
        db.session.commit()
        
        # Log the creation of custom medication
        logger.info(
            f"Custom medication created: {medication.name} "
            f"(ID: {medication.id}, Form: {custom_med.custom_form})"
        )
        
        return jsonify({
            'success': True,
            'data': {
                'medication': medication.to_dict(),
                'customDetails': custom_med.to_dict()
            }
        }), HTTPStatus.CREATED
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating custom medication: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@bp.route('/api/medications/custom/<int:med_id>/verify', methods=['POST'])
def verify_custom_medication(med_id):
    """Verify a custom medication entry"""
    try:
        data = request.get_json()
        custom_med = CustomMedication.query.filter_by(medication_id=med_id).first()
        
        if not custom_med:
            return jsonify({
                'success': False,
                'error': 'Custom medication not found'
            }), HTTPStatus.NOT_FOUND
            
        custom_med.verify(data.get('verificationNotes'))
        db.session.commit()
        
        logger.info(f"Custom medication verified: ID {med_id}")
        
        return jsonify({
            'success': True,
            'data': custom_med.to_dict()
        }), HTTPStatus.OK
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error verifying custom medication: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@bp.route('/api/medications/custom/<int:med_id>', methods=['GET'])
def get_custom_medication(med_id):
    """Get custom medication details"""
    try:
        custom_med = CustomMedication.query.filter_by(medication_id=med_id).first()
        
        if not custom_med:
            return jsonify({
                'success': False,
                'error': 'Custom medication not found'
            }), HTTPStatus.NOT_FOUND
            
        return jsonify({
            'success': True,
            'data': custom_med.to_dict()
        }), HTTPStatus.OK
        
    except Exception as e:
        logger.error(f"Error fetching custom medication: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR
