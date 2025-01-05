"""
Health Check Routes
Last Updated: 2024-12-25T20:33:25+01:00
Status: BETA
Reference: ../../../docs/validation/critical_path/CRITICAL_PATH_STATUS.md

This module implements critical path requirements for health monitoring:
1. System Safety: Health checks
2. Data Safety: Connection validation
3. System Stability: Status reporting
"""

import logging
from datetime import datetime
from flask import Blueprint, jsonify
from app.database import get_session
from sqlalchemy import text

# Critical Path: Route Configuration
bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)

@bp.route('/health', methods=['GET'])
def health_check():
    """
    Perform system health check.
    Critical Path: System Safety
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {
                'database': check_database(),
                'api': True
            }
        }
        
        # Critical Path: Overall Health
        is_healthy = all(health_status['checks'].values())
        health_status['status'] = 'healthy' if is_healthy else 'unhealthy'
        
        status_code = 200 if is_healthy else 503
        logger.info(f"Health check completed at {datetime.utcnow()}")
        return jsonify(health_status), status_code
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 503

def check_database():
    """
    Check database connection.
    Critical Path: Data Safety
    """
    try:
        with get_session() as session:
            # Verify database connection
            session.execute(text('SELECT 1'))
        logger.info(f"Database check passed at {datetime.utcnow()}")
        return True
    except Exception as e:
        logger.error(f"Database check failed: {str(e)}")
        return False
