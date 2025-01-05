from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.natural_alternatives_service import natural_alternatives_service

natural_alternatives_bp = Blueprint('natural_alternatives', __name__, url_prefix='/api/natural-alternatives')

@natural_alternatives_bp.route('/<medication_name>', methods=['GET'])
@jwt_required()
def get_alternatives(medication_name):
    """Get natural alternatives for a specific medication"""
    try:
        condition = request.args.get('condition')
        alternatives = natural_alternatives_service.get_natural_alternatives(medication_name, condition)
        
        if alternatives is None:
            return jsonify({
                'message': 'Error fetching natural alternatives'
            }), 500
            
        return jsonify(alternatives), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Error fetching natural alternatives',
            'error': str(e)
        }), 500

@natural_alternatives_bp.route('/safety/<alternative_name>', methods=['GET'])
@jwt_required()
def get_safety_info(alternative_name):
    """Get safety information for a specific natural alternative"""
    try:
        safety_info = natural_alternatives_service.get_safety_information(alternative_name)
        return jsonify(safety_info), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Error fetching safety information',
            'error': str(e)
        }), 500
