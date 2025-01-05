from flask import Blueprint, request, jsonify, current_app
from app.models.profile import Profile
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback
from datetime import datetime

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('/', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.debug(f'Fetching profile for user {current_user_id}')
        
        profile = Profile.query.filter_by(user_id=current_user_id).first()
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
            
        return jsonify(profile.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching profile: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch profile'}), 500

@profile_bp.route('/', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        current_app.logger.debug(f'Updating profile for user {current_user_id}: {data}')
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        profile = Profile.query.filter_by(user_id=current_user_id).first()
        if not profile:
            # Create new profile if it doesn't exist
            profile = Profile.create_profile(current_user_id, data)
            db.session.add(profile)
        else:
            # Update existing profile
            profile.update_from_dict(data)
            
        db.session.commit()
        return jsonify(profile.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f'Error updating profile: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500

@profile_bp.route('/emergency-contact', methods=['PUT'])
@jwt_required()
def update_emergency_contact():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        current_app.logger.debug(f'Updating emergency contact for user {current_user_id}: {data}')
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        profile = Profile.query.filter_by(user_id=current_user_id).first()
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
            
        profile.emergency_contact_name = data.get('name', profile.emergency_contact_name)
        profile.emergency_contact_phone = data.get('phone', profile.emergency_contact_phone)
        profile.emergency_contact_relationship = data.get('relationship', profile.emergency_contact_relationship)
        
        db.session.commit()
        return jsonify(profile.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f'Error updating emergency contact: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to update emergency contact'}), 500
