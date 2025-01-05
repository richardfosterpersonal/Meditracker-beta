from flask import Blueprint, request, jsonify, current_app
from app.models.family_member import FamilyMember
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback

family_members_bp = Blueprint('family_members', __name__, url_prefix='/family-members')

@family_members_bp.route('/', methods=['GET'])
@jwt_required()
def get_family_members():
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.debug(f'Current user ID from token: {current_user_id}')
        
        try:
            user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
            current_app.logger.debug(f'Converted user ID: {user_id}')
        except (ValueError, TypeError) as e:
            current_app.logger.error(f'Error converting user ID: {str(e)}')
            return jsonify({'error': 'Invalid user ID'}), 400
        
        family_members = FamilyMember.query.filter_by(user_id=user_id).all()
        current_app.logger.debug(f'Found {len(family_members)} family members')
        
        return jsonify([member.to_dict() for member in family_members]), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching family members: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch family members'}), 500

@family_members_bp.route('/', methods=['POST'])
@jwt_required()
def create_family_member():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('name') or not data.get('email'):
            return jsonify({'error': 'Name and email are required'}), 400
            
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        family_member = FamilyMember(
            name=data['name'],
            relationship=data.get('relationship', ''),
            email=data['email'],
            user_id=user_id
        )
        
        db.session.add(family_member)
        db.session.commit()
        
        return jsonify(family_member.to_dict()), 201
    except Exception as e:
        current_app.logger.error(f'Error creating family member: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to create family member'}), 500

@family_members_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_family_member(id):
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        family_member = FamilyMember.query.filter_by(id=id, user_id=user_id).first()
        if not family_member:
            return jsonify({'error': 'Family member not found'}), 404
            
        db.session.delete(family_member)
        db.session.commit()
        
        return jsonify({'message': 'Family member deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f'Error deleting family member: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to delete family member'}), 500
