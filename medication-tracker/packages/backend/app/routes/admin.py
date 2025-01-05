"""
Admin Authentication Routes
Last Updated: 2024-12-25T20:46:35+01:00
Status: INTERNAL
Reference: ../../../docs/validation/decisions/VALIDATION_VISIBILITY.md

This module implements admin-only authentication:
1. Secure access control
2. Environment-aware protection
3. Token-based authentication
"""

import os
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash
from app.database import get_session
from app.models.admin_user import AdminUser

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required(f):
    """Decorator to check for valid admin token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if os.getenv('FLASK_ENV') == 'production':
            return jsonify({'error': 'Admin access not available in production'}), 403

        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401

        try:
            token = token.split('Bearer ')[1]
            payload = jwt.decode(
                token, 
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            if 'admin' not in payload.get('roles', []):
                return jsonify({'error': 'Admin access required'}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated

@bp.route('/login', methods=['POST'])
def login():
    """Admin login endpoint"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Admin login not available in production'}), 403

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    with get_session() as session:
        admin = session.query(AdminUser).filter_by(username=username).first()
        
        if not admin or not check_password_hash(admin.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401

        token = jwt.encode(
            {
                'sub': admin.id,
                'username': admin.username,
                'roles': ['admin'],
                'exp': datetime.utcnow() + timedelta(hours=1)
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'token': token,
            'expires_in': 3600  # 1 hour
        })

@bp.route('/validate', methods=['GET'])
@admin_required
def validate_token():
    """Validate admin token"""
    return jsonify({'valid': True})

@bp.route('/status', methods=['GET'])
@admin_required
def admin_status():
    """Get admin status information"""
    return jsonify({
        'environment': os.getenv('FLASK_ENV', 'development'),
        'timestamp': datetime.utcnow().isoformat(),
        'features': {
            'validation_dashboard': True,
            'system_logs': True,
            'health_monitoring': True
        }
    })
