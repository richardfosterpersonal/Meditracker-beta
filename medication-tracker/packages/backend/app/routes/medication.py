from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.medication import Medication
from ..models.user import User
from ..services.scheduler_service import scheduler_service
from .. import db
from datetime import datetime
import pytz

medication_bp = Blueprint('medication', __name__)

@medication_bp.route('/api/medications', methods=['GET'])
@jwt_required()
def get_medications():
    """Get all medications for the current user"""
    try:
        user_id = get_jwt_identity()
        medications = Medication.query.filter_by(user_id=user_id).all()
        return jsonify({
            'status': 'success',
            'data': [med.to_dict() for med in medications]
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@medication_bp.route('/api/medications', methods=['POST'])
@jwt_required()
def create_medication():
    """Create a new medication"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        # Create medication
        medication = Medication(
            user_id=user_id,
            name=data['name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            category=data.get('category'),
            instructions=data.get('instructions'),
            start_date=datetime.fromisoformat(data['startDate']) if data.get('startDate') else None,
            end_date=datetime.fromisoformat(data['endDate']) if data.get('endDate') else None,
            reminder_enabled=data.get('reminderEnabled', True),
            reminder_time=data.get('reminderTime', 30),
            doses_per_day=data.get('dosesPerDay'),
            dose_times=data.get('doseTimes', ['09:00']),
            remaining_doses=data.get('remainingDoses'),
            refill_reminder_enabled=data.get('refillReminderEnabled', True),
            refill_reminder_doses=data.get('refillReminderDoses', 7),
            # PRN fields
            is_prn=data.get('isPrn', False),
            min_hours_between_doses=data.get('minHoursBetweenDoses'),
            max_daily_doses=data.get('maxDailyDoses'),
            reason_for_taking=data.get('reasonForTaking')
        )
        
        db.session.add(medication)
        db.session.commit()
        
        # Only schedule notifications for non-PRN medications
        if not medication.is_prn:
            medication.schedule_next_dose()
            scheduler_service.schedule_medication_notifications(medication)
        
        return jsonify({
            'status': 'success',
            'message': 'Medication created successfully',
            'data': medication.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@medication_bp.route('/api/medications/<int:medication_id>', methods=['PUT'])
@jwt_required()
def update_medication(medication_id):
    """Update a medication"""
    try:
        user_id = get_jwt_identity()
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        
        if not medication:
            return jsonify({
                'status': 'error',
                'message': 'Medication not found'
            }), 404
        
        data = request.json
        
        # Update fields
        medication.name = data.get('name', medication.name)
        medication.dosage = data.get('dosage', medication.dosage)
        medication.frequency = data.get('frequency', medication.frequency)
        medication.category = data.get('category', medication.category)
        medication.instructions = data.get('instructions', medication.instructions)
        
        if 'startDate' in data:
            medication.start_date = datetime.fromisoformat(data['startDate'])
        if 'endDate' in data:
            medication.end_date = datetime.fromisoformat(data['endDate'])
            
        medication.reminder_enabled = data.get('reminderEnabled', medication.reminder_enabled)
        medication.reminder_time = data.get('reminderTime', medication.reminder_time)
        medication.doses_per_day = data.get('dosesPerDay', medication.doses_per_day)
        medication.dose_times = data.get('doseTimes', medication.dose_times)
        medication.remaining_doses = data.get('remainingDoses', medication.remaining_doses)
        medication.refill_reminder_enabled = data.get('refillReminderEnabled', medication.refill_reminder_enabled)
        medication.refill_reminder_doses = data.get('refillReminderDoses', medication.refill_reminder_doses)
        
        # PRN fields
        medication.is_prn = data.get('isPrn', medication.is_prn)
        medication.min_hours_between_doses = data.get('minHoursBetweenDoses', medication.min_hours_between_doses)
        medication.max_daily_doses = data.get('maxDailyDoses', medication.max_daily_doses)
        medication.reason_for_taking = data.get('reasonForTaking', medication.reason_for_taking)
        
        db.session.commit()
        
        # Only schedule notifications for non-PRN medications
        if not medication.is_prn:
            medication.schedule_next_dose()
            scheduler_service.schedule_medication_notifications(medication)
        
        return jsonify({
            'status': 'success',
            'message': 'Medication updated successfully',
            'data': medication.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@medication_bp.route('/api/medications/<int:medication_id>', methods=['DELETE'])
@jwt_required()
def delete_medication(medication_id):
    """Delete a medication"""
    try:
        user_id = get_jwt_identity()
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        
        if not medication:
            return jsonify({
                'status': 'error',
                'message': 'Medication not found'
            }), 404
        
        # Cancel notifications
        scheduler_service.cancel_medication_notifications(medication)
        
        # Delete medication
        db.session.delete(medication)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Medication deleted successfully'
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@medication_bp.route('/api/medications/<int:medication_id>/take', methods=['POST'])
@jwt_required()
def record_dose(medication_id):
    """Record that a medication dose was taken"""
    try:
        user_id = get_jwt_identity()
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        
        if not medication:
            return jsonify({
                'status': 'error',
                'message': 'Medication not found'
            }), 404
        
        # For PRN medications, check if it's safe to take a dose
        if medication.is_prn and not medication.can_take_dose():
            return jsonify({
                'status': 'error',
                'message': 'Cannot take dose at this time due to timing restrictions'
            }), 400
        
        # Get taken time and reason from request
        taken_at = None
        if 'takenAt' in request.json:
            taken_at = datetime.fromisoformat(request.json['takenAt'])
        
        reason = request.json.get('reason') if medication.is_prn else None
        
        # Record the dose
        medication.record_dose_taken(taken_at, reason)
        
        return jsonify({
            'status': 'success',
            'message': 'Dose recorded successfully',
            'data': medication.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@medication_bp.route('/api/medications/<int:medication_id>/refill', methods=['POST'])
@jwt_required()
def record_refill(medication_id):
    """Record a medication refill"""
    try:
        user_id = get_jwt_identity()
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        
        if not medication:
            return jsonify({
                'status': 'error',
                'message': 'Medication not found'
            }), 404
        
        # Update remaining doses
        medication.remaining_doses = request.json.get('doses', 30)  # Default to 30 doses
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Refill recorded successfully',
            'data': medication.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
