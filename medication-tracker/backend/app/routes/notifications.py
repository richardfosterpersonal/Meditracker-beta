from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.medication import Medication
from ..models.medication_history import MedicationHistory
from ..models.notification_preferences import NotificationPreferences
from ..models.notification import Notification
from datetime import datetime, timedelta, time
from .. import db

notifications = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    try:
        user_id = get_jwt_identity()
        prefs = NotificationPreferences.query.filter_by(user_id=user_id).first()
        
        if not prefs:
            prefs = NotificationPreferences.get_default_preferences(user_id)
            db.session.add(prefs)
            db.session.commit()
            
        return jsonify(prefs.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        user_id = get_jwt_identity()
        prefs = NotificationPreferences.query.filter_by(user_id=user_id).first()
        
        if not prefs:
            prefs = NotificationPreferences.get_default_preferences(user_id)
            db.session.add(prefs)
        
        data = request.json
        
        # Update time fields
        if 'quiet_hours_start' in data:
            hours, minutes = map(int, data['quiet_hours_start'].split(':'))
            prefs.quiet_hours_start = time(hours, minutes)
            
        if 'quiet_hours_end' in data:
            hours, minutes = map(int, data['quiet_hours_end'].split(':'))
            prefs.quiet_hours_end = time(hours, minutes)
            
        # Update boolean fields
        boolean_fields = [
            'email_notifications', 'browser_notifications', 'notification_sound',
            'notify_upcoming_doses', 'notify_missed_doses', 
            'notify_refill_reminders', 'notify_interactions'
        ]
        
        for field in boolean_fields:
            if field in data:
                setattr(prefs, field, data[field])
                
        # Update integer fields
        integer_fields = [
            'reminder_advance_minutes', 'max_daily_reminders',
            'reminder_frequency_minutes', 'refill_reminder_days_before'
        ]
        
        for field in integer_fields:
            if field in data:
                setattr(prefs, field, int(data[field]))
        
        db.session.commit()
        return jsonify(prefs.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications.route('/', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def handle_notifications():
    if request.method == 'OPTIONS':
        response = current_app.make_default_options_response()
        return response
        
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get user preferences
        prefs = NotificationPreferences.query.filter_by(user_id=user_id).first()
        if not prefs:
            prefs = NotificationPreferences.get_default_preferences(user_id)
            db.session.add(prefs)
            db.session.commit()

        # Get current time
        now = datetime.utcnow()
        current_time = now.time()

        # Check if we're in quiet hours
        in_quiet_hours = False
        if prefs.quiet_hours_start and prefs.quiet_hours_end:
            if prefs.quiet_hours_start > prefs.quiet_hours_end:  # Crosses midnight
                in_quiet_hours = current_time >= prefs.quiet_hours_start or current_time <= prefs.quiet_hours_end
            else:
                in_quiet_hours = prefs.quiet_hours_start <= current_time <= prefs.quiet_hours_end

        # Only proceed if not in quiet hours
        if in_quiet_hours:
            return jsonify([]), 200

        end_time = now + timedelta(hours=24)
        notifications = []
        
        medications = Medication.query.filter_by(user_id=user_id).all()

        # Check for medication interactions (if enabled)
        if prefs.notify_interactions:
            active_medications = [med for med in medications if med.is_active]
            for i, med1 in enumerate(active_medications):
                for med2 in active_medications[i+1:]:
                    if has_interaction(med1, med2):
                        notifications.append({
                            'type': 'interaction_warning',
                            'priority': 'high',
                            'medicationId': [med1.id, med2.id],
                            'medicationName': [med1.name, med2.name],
                            'message': f'WARNING: Potential interaction between {med1.name} and {med2.name}',
                            'time': now.isoformat(),
                            'requiresAcknowledgment': True
                        })

        # Get upcoming medications (if enabled)
        if prefs.notify_upcoming_doses:
            for med in medications:
                if med.next_dose and now <= med.next_dose <= end_time:
                    # Check if within reminder advance time
                    time_until_dose = (med.next_dose - now).total_seconds() / 60
                    if time_until_dose <= prefs.reminder_advance_minutes:
                        notifications.append({
                            'type': 'upcoming',
                            'priority': 'normal',
                            'medicationId': med.id,
                            'medicationName': med.name,
                            'message': f'Remember to take {med.name} at {med.next_dose.strftime("%I:%M %p")}',
                            'time': med.next_dose.isoformat(),
                            'requiresAcknowledgment': False
                        })

        # Get missed medications (if enabled)
        if prefs.notify_missed_doses:
            history = MedicationHistory.query.join(Medication).filter(
                Medication.user_id == user_id,
                MedicationHistory.scheduled_time >= now - timedelta(hours=24),
                MedicationHistory.scheduled_time <= now,
                MedicationHistory.action == 'missed'
            ).all()

            for record in history:
                notifications.append({
                    'type': 'missed',
                    'priority': 'high',
                    'medicationId': record.medication_id,
                    'medicationName': record.medication.name,
                    'message': f'You missed {record.medication.name} at {record.scheduled_time.strftime("%I:%M %p")}',
                    'time': record.scheduled_time.isoformat(),
                    'requiresAcknowledgment': True
                })

        # Check for refill reminders (if enabled)
        if prefs.notify_refill_reminders:
            for med in medications:
                if med.is_active and med.remaining_doses is not None:
                    days_until_empty = med.remaining_doses / med.doses_per_day if med.doses_per_day > 0 else float('inf')
                    if days_until_empty <= prefs.refill_reminder_days_before:
                        notifications.append({
                            'type': 'refill',
                            'priority': 'normal',
                            'medicationId': med.id,
                            'medicationName': med.name,
                            'message': f'Refill reminder: {med.name} will run out in {int(days_until_empty)} days',
                            'time': now.isoformat(),
                            'requiresAcknowledgment': True
                        })

        # Sort notifications by priority first, then time
        notifications.sort(key=lambda x: (
            0 if x['priority'] == 'high' else 1,
            x['time']
        ))

        # Limit notifications based on max_daily_reminders
        return jsonify(notifications[:prefs.max_daily_reminders]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def has_interaction(med1, med2):
    """
    Check for potential interactions between two medications.
    This is a placeholder for actual interaction checking logic.
    In a production environment, this should use a proper drug interaction database.
    """
    # For demonstration, checking if both medications have interactions field
    if hasattr(med1, 'interactions') and hasattr(med2, 'interactions'):
        return med2.name in med1.interactions or med1.name in med2.interactions
    return False

@notifications.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        subscription = request.json.get('subscription')
        if not subscription:
            return jsonify({'error': 'No subscription data provided'}), 400
            
        user.push_subscription = subscription
        db.session.commit()
        
        return jsonify({'message': 'Successfully subscribed to notifications'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications.route('/unsubscribe', methods=['POST'])
@jwt_required()
def unsubscribe():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        user.push_subscription = None
        db.session.commit()
        
        return jsonify({'message': 'Successfully unsubscribed from notifications'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications.route('/scheduled', methods=['GET'])
@jwt_required()
def get_scheduled_notifications():
    """Get all scheduled notifications for the current user"""
    try:
        user_id = get_jwt_identity()
        notifications = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.status == 'scheduled',
            Notification.scheduled_time > datetime.utcnow()
        ).order_by(Notification.scheduled_time).all()
        
        return jsonify([n.to_dict() for n in notifications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications.route('/history', methods=['GET'])
@jwt_required()
def get_notification_history():
    """Get notification history for the current user"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'notifications': [n.to_dict() for n in notifications.items],
            'total': notifications.total,
            'pages': notifications.pages,
            'current_page': notifications.page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications.route('/acknowledge/<int:notification_id>', methods=['POST'])
@jwt_required()
def acknowledge_notification(notification_id):
    """Mark a notification as acknowledged"""
    try:
        user_id = get_jwt_identity()
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
            
        notification.mark_as_acknowledged()
        return jsonify({'message': 'Notification acknowledged successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications.route('/test', methods=['POST'])
@jwt_required()
def send_test_notification():
    """Send a test notification to the user"""
    try:
        user_id = get_jwt_identity()
        notification = Notification(
            user_id=user_id,
            type='TEST',
            status='scheduled',
            priority='normal',
            data={'message': 'This is a test notification'},
            scheduled_time=datetime.utcnow()
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({'message': 'Test notification sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
