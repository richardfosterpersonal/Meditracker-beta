from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.herb_drug_interaction_service import herb_drug_interaction_service
from app.models.medication import Medication
from app.models.user import User
from app import db

herb_drug_interactions_bp = Blueprint('herb_drug_interactions', __name__, url_prefix='/api/herb-drug-interactions')

@herb_drug_interactions_bp.route('/check-interaction', methods=['POST'])
@jwt_required()
async def check_interaction():
    """
    Check for interactions between herbs and medications
    """
    try:
        data = request.get_json()
        if not data or 'herb' not in data or 'drug' not in data:
            return jsonify({
                'error': 'Missing required parameters: herb and drug'
            }), 400

        herb = data['herb']
        drug = data['drug']

        # Get interaction data from service
        interaction_data = await herb_drug_interaction_service.check_interaction(herb, drug)
        
        if not interaction_data:
            return jsonify({
                'message': 'No interaction data found',
                'data': None
            }), 404

        return jsonify({
            'message': 'Interaction data retrieved successfully',
            'data': interaction_data
        }), 200

    except Exception as e:
        return jsonify({
            'error': f'Error checking interactions: {str(e)}'
        }), 500

@herb_drug_interactions_bp.route('/check-user-medications', methods=['POST'])
@jwt_required()
async def check_user_medications():
    """
    Check interactions between a natural product and all user's medications
    """
    try:
        data = request.get_json()
        if not data or 'herb' not in data:
            return jsonify({
                'error': 'Missing required parameter: herb'
            }), 400

        herb = data['herb']
        user_id = get_jwt_identity()

        # Get user's active medications
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404

        medications = Medication.query.filter_by(
            user_id=user_id,
            is_active=True
        ).all()

        if not medications:
            return jsonify({
                'message': 'No active medications found',
                'data': []
            }), 200

        # Check interactions for each medication
        interactions = []
        for med in medications:
            interaction_data = await herb_drug_interaction_service.check_interaction(
                herb=herb,
                drug=med.name
            )
            if interaction_data:
                interactions.append({
                    'medication': med.name,
                    'interaction': interaction_data
                })

        # Sort interactions by severity
        severity_order = {'Major': 3, 'Moderate': 2, 'Minor': 1, 'Unknown': 0}
        interactions.sort(
            key=lambda x: severity_order.get(x['interaction']['severity'], -1),
            reverse=True
        )

        return jsonify({
            'message': 'Interaction check completed',
            'data': {
                'herb': herb,
                'interactions': interactions,
                'medications_checked': len(medications),
                'interactions_found': len(interactions)
            }
        }), 200

    except Exception as e:
        return jsonify({
            'error': f'Error checking interactions: {str(e)}'
        }), 500

@herb_drug_interactions_bp.route('/interaction-history', methods=['GET'])
@jwt_required()
def get_interaction_history():
    """
    Get user's interaction check history
    """
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Get user's interaction history from cache
        history = herb_drug_interaction_service.get_user_history(user_id)
        
        # Paginate results
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_history = history[start_idx:end_idx]

        return jsonify({
            'message': 'Interaction history retrieved successfully',
            'data': {
                'history': paginated_history,
                'total': len(history),
                'page': page,
                'per_page': per_page,
                'total_pages': (len(history) + per_page - 1) // per_page
            }
        }), 200

    except Exception as e:
        return jsonify({
            'error': f'Error retrieving interaction history: {str(e)}'
        }), 500
