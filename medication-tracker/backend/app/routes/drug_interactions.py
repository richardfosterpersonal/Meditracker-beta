from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.medication import Medication
from ..services.drug_interaction_service import drug_interaction_service
from .. import db

drug_interactions_bp = Blueprint('drug_interactions', __name__, url_prefix='/api/drug-interactions')

@drug_interactions_bp.route('/check', methods=['POST'])
@jwt_required()
def check_interactions():
    """Check interactions between medications"""
    try:
        data = request.get_json()
        medication_ids = data.get('medication_ids', [])
        
        if not medication_ids or len(medication_ids) < 2:
            return jsonify({
                'message': 'At least two medications are required'
            }), 400
            
        medications = Medication.query.filter(
            Medication.id.in_(medication_ids)
        ).all()
        
        if len(medications) != len(medication_ids):
            return jsonify({
                'message': 'One or more medications not found'
            }), 404
            
        interactions = []
        # Check each pair of medications
        for i in range(len(medications)):
            for j in range(i + 1, len(medications)):
                med1 = medications[i]
                med2 = medications[j]
                
                interaction = drug_interaction_service.check_interaction(
                    med1.name,
                    med2.name
                )
                
                if interaction:
                    interactions.append({
                        'medication1': {
                            'id': med1.id,
                            'name': med1.name
                        },
                        'medication2': {
                            'id': med2.id,
                            'name': med2.name
                        },
                        'interactions': interaction
                    })
        
        return jsonify({
            'interactions': interactions
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking interactions: {str(e)}")
        return jsonify({
            'message': 'Error checking interactions',
            'error': str(e)
        }), 500

@drug_interactions_bp.route('/info/<medication_id>', methods=['GET'])
@jwt_required()
def get_medication_info(medication_id):
    """Get detailed medication information"""
    try:
        medication = Medication.query.get(medication_id)
        if not medication:
            return jsonify({
                'message': 'Medication not found'
            }), 404
            
        info = drug_interaction_service.get_detailed_info(medication.name)
        if not info:
            return jsonify({
                'message': 'No information found for this medication'
            }), 404
            
        return jsonify(info), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting medication info: {str(e)}")
        return jsonify({
            'message': 'Error getting medication information',
            'error': str(e)
        }), 500

@drug_interactions_bp.route('/search/<medication_name>', methods=['GET'])
@jwt_required()
def search_medication(medication_name):
    """Search for medication information by name"""
    try:
        info = drug_interaction_service.get_detailed_info(medication_name)
        if not info:
            return jsonify({
                'message': 'No information found for this medication'
            }), 404
            
        return jsonify(info), 200
        
    except Exception as e:
        current_app.logger.error(f"Error searching medication: {str(e)}")
        return jsonify({
            'message': 'Error searching medication',
            'error': str(e)
        }), 500
