from flask import Blueprint, request, jsonify, current_app
from app.models.medication_history import MedicationHistory
from app.models.medication import Medication
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import traceback

medication_history = Blueprint('medication_history', __name__, url_prefix='/api/medication-history')

@medication_history.route('/', methods=['GET', 'POST', 'OPTIONS'])
@jwt_required(optional=True)
def handle_medication_history():
    if request.method == 'OPTIONS':
        response = current_app.make_default_options_response()
        return response
        
    if request.method == 'GET':
        return get_history()
    else:
        return add_history()

@medication_history.route('/medication/<int:medication_id>', methods=['GET'])
@jwt_required()
def get_history_by_medication(medication_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify medication belongs to user
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404

        history = MedicationHistory.query.filter_by(medication_id=medication_id).all()
        return jsonify([h.to_dict() for h in history]), 200

    except Exception as e:
        current_app.logger.error(f'Error getting medication history: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@medication_history.route('/stats/<int:medication_id>', methods=['GET'])
@jwt_required()
def get_stats(medication_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify medication belongs to user
        medication = Medication.query.filter_by(id=medication_id, user_id=user_id).first()
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404

        # Get date range from query parameters or default to last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        if request.args.get('startDate'):
            start_date = datetime.fromisoformat(request.args.get('startDate'))
        if request.args.get('endDate'):
            end_date = datetime.fromisoformat(request.args.get('endDate'))

        # Query history within date range
        history = MedicationHistory.query.filter(
            MedicationHistory.medication_id == medication_id,
            MedicationHistory.scheduled_time >= start_date,
            MedicationHistory.scheduled_time <= end_date
        ).all()

        # Calculate statistics
        total_doses = len(history)
        taken_on_time = sum(1 for h in history if h.action == 'taken' and h.taken_time and 
                          abs((h.taken_time - h.scheduled_time).total_seconds()) <= 1800)  # within 30 minutes
        taken_late = sum(1 for h in history if h.action == 'taken' and h.taken_time and 
                       (h.taken_time - h.scheduled_time).total_seconds() > 1800)
        missed = sum(1 for h in history if h.action == 'missed')

        stats = {
            'totalDoses': total_doses,
            'takenOnTime': taken_on_time,
            'takenLate': taken_late,
            'missed': missed,
            'adherenceRate': (taken_on_time + taken_late) / total_doses if total_doses > 0 else 0
        }

        return jsonify(stats), 200

    except Exception as e:
        current_app.logger.error(f'Error getting medication stats: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@medication_history.route('/stats/summary', methods=['GET'])
@jwt_required()
def get_summary_stats():
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters for date range
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        # Convert dates if provided
        start = datetime.fromisoformat(start_date) if start_date else datetime.now() - timedelta(days=30)
        end = datetime.fromisoformat(end_date) if end_date else datetime.now()
        
        # Get all medications for user
        medications = Medication.query.filter_by(user_id=user_id).all()
        
        summary_stats = {
            'total_medications': len(medications),
            'total_doses': 0,
            'doses_taken': 0,
            'doses_missed': 0,
            'compliance_rate': 0,
            'medications_stats': []
        }
        
        for medication in medications:
            # Get history for this medication
            history = MedicationHistory.query.filter(
                MedicationHistory.medication_id == medication.id,
                MedicationHistory.scheduled_time.between(start, end)
            ).all()
            
            med_stats = {
                'medication_id': medication.id,
                'medication_name': medication.name,
                'total_doses': len(history),
                'doses_taken': sum(1 for h in history if h.taken_time is not None),
                'doses_missed': sum(1 for h in history if h.taken_time is None and h.scheduled_time < datetime.now()),
                'compliance_rate': 0
            }
            
            med_stats['compliance_rate'] = (med_stats['doses_taken'] / med_stats['total_doses'] * 100) if med_stats['total_doses'] > 0 else 0
            
            summary_stats['total_doses'] += med_stats['total_doses']
            summary_stats['doses_taken'] += med_stats['doses_taken']
            summary_stats['doses_missed'] += med_stats['doses_missed']
            summary_stats['medications_stats'].append(med_stats)
        
        summary_stats['compliance_rate'] = (summary_stats['doses_taken'] / summary_stats['total_doses'] * 100) if summary_stats['total_doses'] > 0 else 0
        
        return jsonify(summary_stats), 200
        
    except Exception as e:
        current_app.logger.error(f'Error getting summary statistics: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def get_history():
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        medication_id = request.args.get('medicationId', type=int)
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 10, type=int)

        # Base query
        query = MedicationHistory.query.join(Medication).filter(Medication.user_id == user_id)

        # Apply filters
        if medication_id:
            query = query.filter(MedicationHistory.medication_id == medication_id)
        if start_date:
            query = query.filter(MedicationHistory.scheduled_time >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(MedicationHistory.scheduled_time <= datetime.fromisoformat(end_date))

        # Order by scheduled time descending
        query = query.order_by(MedicationHistory.scheduled_time.desc())

        # Paginate results
        paginated_history = query.paginate(page=page, per_page=per_page)

        return jsonify({
            'items': [history.to_dict() for history in paginated_history.items],
            'total': paginated_history.total,
            'pages': paginated_history.pages,
            'currentPage': page
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting medication history: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def add_history():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['medicationId', 'action', 'scheduledTime']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Verify medication belongs to user
        medication = Medication.query.filter_by(id=data['medicationId'], user_id=user_id).first()
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404

        history = MedicationHistory(
            medication_id=data['medicationId'],
            action=data['action'],
            scheduled_time=datetime.fromisoformat(data['scheduledTime']),
            taken_time=datetime.fromisoformat(data['takenTime']) if data.get('takenTime') else None,
            notes=data.get('notes', '')
        )

        db.session.add(history)
        db.session.commit()

        return jsonify(history.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error adding medication history: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
