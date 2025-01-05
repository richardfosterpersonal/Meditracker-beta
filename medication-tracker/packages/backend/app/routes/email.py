from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..services.email_service import email_service
from ..services.email_templates import EmailTemplates
from ..models.notification import Notification
from .. import db

email_bp = Blueprint('email', __name__)

@email_bp.route('/api/email/test', methods=['POST'])
@jwt_required()
def test_email():
    """Send a test email to verify email settings"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.email:
            return jsonify({
                'status': 'error',
                'message': 'User email not configured'
            }), 400

        # Render test email template
        html_content = EmailTemplates.render_template(
            EmailTemplates.upcoming_dose_template,
            title="Test Email",
            user_name=user.name,
            base_url=current_app.config['BASE_URL'],
            action_url=f"{current_app.config['BASE_URL']}/settings/notifications",
            medication={
                'name': 'Test Medication',
                'dosage': '100mg',
                'instructions': 'This is a test email to verify your notification settings.'
            },
            scheduled_time='Now'
        )

        # Queue the test email
        email_service.queue_email(
            to_email=user.email,
            subject="Medication Tracker - Test Email",
            html_content=html_content
        )

        return jsonify({
            'status': 'success',
            'message': f'Test email queued for {user.email}'
        })

    except Exception as e:
        current_app.logger.error(f"Error sending test email: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/api/email/preferences', methods=['GET'])
@jwt_required()
def get_email_preferences():
    """Get user's email preferences"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        return jsonify({
            'status': 'success',
            'data': user.notification_preferences.get('email', {})
        })

    except Exception as e:
        current_app.logger.error(f"Error getting email preferences: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/api/email/preferences', methods=['PUT'])
@jwt_required()
def update_email_preferences():
    """Update user's email preferences"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        preferences = request.json
        current_prefs = user.notification_preferences or {}
        current_prefs['email'] = preferences
        user.notification_preferences = current_prefs
        user.save()

        return jsonify({
            'status': 'success',
            'message': 'Email preferences updated successfully',
            'data': preferences
        })

    except Exception as e:
        current_app.logger.error(f"Error updating email preferences: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/api/email/verify', methods=['POST'])
@jwt_required()
def verify_email():
    """Send email verification code"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        verification_code = user.generate_email_verification_code()
        
        html_content = EmailTemplates.render_template(
            lambda: Template("""
            {% extends base_template %}
            {% block content %}
            <p>Hello {{ user_name }},</p>
            <p>Your email verification code is:</p>
            <h2 style="text-align: center; color: #4a90e2;">{{ code }}</h2>
            <p>This code will expire in 10 minutes.</p>
            {% endblock %}
            """),
            title="Verify Your Email",
            user_name=user.name,
            code=verification_code,
            base_url=current_app.config['BASE_URL']
        )

        email_service.queue_email(
            to_email=user.email,
            subject="Medication Tracker - Email Verification",
            html_content=html_content
        )

        return jsonify({
            'status': 'success',
            'message': 'Verification code sent successfully'
        })

    except Exception as e:
        current_app.logger.error(f"Error sending verification email: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/api/email/verify/<code>', methods=['POST'])
@jwt_required()
def confirm_email_verification(code):
    """Confirm email verification code"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        if user.verify_email_code(code):
            return jsonify({
                'status': 'success',
                'message': 'Email verified successfully'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired verification code'
            }), 400

    except Exception as e:
        current_app.logger.error(f"Error verifying email: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/api/email/settings', methods=['PUT'])
@jwt_required()
def update_email_settings():
    """Update email notification settings"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        # Update email settings in user preferences
        prefs = NotificationPreferences.query.filter_by(user_id=user_id).first()
        if not prefs:
            return jsonify({
                'status': 'error',
                'message': 'User preferences not found'
            }), 404
            
        prefs.email_notifications = data.get('enabled', prefs.email_notifications)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Email settings updated successfully',
            'data': prefs.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@email_bp.route('/test', methods=['POST'])
def test_email_no_auth():
    """Send a test email without authentication (for testing only)"""
    try:
        html_content = EmailTemplates.render_template(
            lambda: EmailTemplates.upcoming_dose_template(),
            title="Test Email",
            user_name="Test User",
            base_url="http://localhost:3000",
            action_url="http://localhost:3000/settings/notifications",
            medication={
                'name': 'Test Medication',
                'dosage': '100mg',
                'instructions': 'This is a test email to verify your notification settings.'
            },
            scheduled_time='Now'
        )

        email_service.queue_email(
            to_email="smartmedtracker@gmail.com",
            subject="Medication Tracker - Test Email",
            html_content=html_content
        )

        return jsonify({
            'status': 'success',
            'message': 'Test email queued'
        })

    except Exception as e:
        current_app.logger.error(f"Error sending test email: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
