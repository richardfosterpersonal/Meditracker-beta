from flask import Blueprint, request, jsonify, current_app
from app.models.medication import Medication
from app.models.medication_history import MedicationHistory
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import traceback

medications = Blueprint('medications', __name__)

@medications.before_request
def log_request_info():
    current_app.logger.debug('Headers: %s', request.headers)
    current_app.logger.debug('Body: %s', request.get_data())

@medications.route('/', methods=['GET'])
@jwt_required()
def get_medications():
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.debug(f'Current user ID from token: {current_user_id}')
        
        try:
            user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
            current_app.logger.debug(f'Converted user ID: {user_id}')
        except (ValueError, TypeError) as e:
            current_app.logger.error(f'Error converting user ID: {str(e)}')
            return jsonify({'error': 'Invalid user ID'}), 400
        
        medications = Medication.query.filter_by(user_id=user_id).all()
        current_app.logger.debug(f'Found {len(medications)} medications')
        
        return jsonify([med.to_dict() for med in medications]), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching medications: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch medications'}), 500

@medications.route('/', methods=['POST'])
@jwt_required()
def create_medication():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        current_app.logger.debug(f'Creating medication for user {current_user_id}: {data}')
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        required_fields = ['name', 'dosage', 'frequency', 'time']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        medication = Medication(
            user_id=current_user_id,
            name=data['name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            next_dose=datetime.fromisoformat(data['time']),
            category=data.get('category'),
            instructions=data.get('instructions', ''),
            reminder_enabled=data.get('reminderEnabled', True),
            reminder_time=data.get('reminderTime', 30)
        )
        
        db.session.add(medication)
        db.session.commit()
        
        current_app.logger.debug(f'Created medication: {medication.to_dict()}')
        return jsonify(medication.to_dict()), 201
    except Exception as e:
        current_app.logger.error(f'Error creating medication: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to create medication'}), 500

@medications.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_medication(id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        current_app.logger.debug(f'Updating medication {id} for user {current_user_id}: {data}')
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        medication = Medication.query.filter_by(id=id, user_id=current_user_id).first()
        
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
        
        # Update fields
        if 'name' in data:
            medication.name = data['name']
        if 'dosage' in data:
            medication.dosage = data['dosage']
        if 'frequency' in data:
            medication.frequency = data['frequency']
        if 'time' in data:
            medication.time = datetime.fromisoformat(data['time'])
        if 'notes' in data:
            medication.notes = data['notes']
        
        db.session.commit()
        current_app.logger.debug(f'Updated medication: {medication.to_dict()}')
        return jsonify(medication.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f'Error updating medication: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to update medication'}), 500

@medications.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_medication(id):
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.debug(f'Deleting medication {id} for user {current_user_id}')
        
        medication = Medication.query.filter_by(id=id, user_id=current_user_id).first()
        
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
        
        db.session.delete(medication)
        db.session.commit()
        
        current_app.logger.debug(f'Deleted medication {id}')
        return jsonify({'message': 'Medication deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f'Error deleting medication: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to delete medication'}), 500

@medications.route('/<int:id>/stats', methods=['GET'])
@jwt_required()
def get_medication_stats(id):
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.debug(f'Getting stats for medication {id} for user {current_user_id}')
        
        medication = Medication.query.filter_by(id=id, user_id=current_user_id).first()
        
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
            
        # Get all history entries for this medication
        history = MedicationHistory.query.filter_by(medication_id=id).all()
        
        # Calculate statistics
        total_doses = len(history)
        taken_doses = len([h for h in history if h.action == 'taken'])
        missed_doses = len([h for h in history if h.action == 'missed'])
        
        # Calculate adherence rate
        adherence_rate = (taken_doses / total_doses * 100) if total_doses > 0 else 0
        
        # Calculate average time difference for taken doses
        time_differences = []
        for h in history:
            if h.action == 'taken' and h.taken_time:
                time_diff = h.taken_time - h.scheduled_time
                time_differences.append(abs(time_diff.total_seconds() / 60))  # Convert to minutes
                
        avg_time_difference = sum(time_differences) / len(time_differences) if time_differences else 0
        
        stats = {
            'totalDoses': total_doses,
            'takenDoses': taken_doses,
            'missedDoses': missed_doses,
            'adherenceRate': round(adherence_rate, 2),
            'averageTimeDifference': round(avg_time_difference, 2)  # In minutes
        }
        
        current_app.logger.debug(f'Stats for medication {id}: {stats}')
        return jsonify(stats), 200
        
    except Exception as e:
        current_app.logger.error(f'Error getting medication stats: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to get medication stats'}), 500