from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..utils.vapid_keys import send_push_notification
import json
from app.models.user import User
from app import db

test_bp = Blueprint('test', __name__)

@test_bp.route('/api/test/push-notification', methods=['POST'])
@jwt_required()
def test_push_notification():
    try:
        # Get the push subscription info from the request
        subscription = request.json.get('subscription')
        if not subscription:
            return jsonify({'error': 'No subscription info provided'}), 400

        # Test notification data
        notification_data = {
            'title': 'Test Notification',
            'body': 'This is a test notification from your Medication Tracker!',
            'icon': '/logo192.png',
            'badge': '/logo192.png',
            'data': {
                'notification_id': 'test-notification',
                'medication_id': 'test-medication'
            }
        }

        # VAPID claims
        vapid_claims = {
            'sub': 'mailto:test@example.com'  # Replace with your email
        }

        # Send the notification
        success, response = send_push_notification(
            subscription_info=subscription,
            data=notification_data,
            vapid_claims=vapid_claims
        )

        if success:
            return jsonify({'message': 'Test notification sent successfully'}), 200
        else:
            return jsonify({'error': f'Failed to send notification: {response}'}), 500

    except Exception as e:
        return jsonify({'error': f'Error sending test notification: {str(e)}'}), 500

@test_bp.route('/create-test-user', methods=['POST'])
def create_test_user():
    # Check if test user already exists
    if User.query.filter_by(email='test@example.com').first():
        return jsonify({'message': 'Test user already exists'}), 200
    
    # Create test user
    user = User(
        email='test@example.com',
        name='Test User'
    )
    user.set_password('password123')
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Test user created successfully'}), 201
