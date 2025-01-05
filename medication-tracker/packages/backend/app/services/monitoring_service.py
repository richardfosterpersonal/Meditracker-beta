"""
Monitoring Service
Last Updated: 2024-12-25T22:30:07+01:00
Critical Path: Monitoring
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from app.core.config import settings
from app.models.medication import Medication
from app.models.user import User

logger = logging.getLogger(__name__)

class MonitoringService:
    """Service for monitoring system health and critical path components."""
    
    def __init__(self):
        self.logger = logger
        
    def monitor_critical_path(self) -> Dict[str, bool]:
        """Monitor critical path components."""
        results = {
            "database": self._check_database(),
            "auth": self._check_auth(),
            "medication": self._check_medication(),
            "notification": self._check_notification()
        }
        return results
        
    def _check_database(self) -> bool:
        """Check database health."""
        try:
            # Perform a simple query
            User.query.limit(1).all()
            return True
        except Exception as e:
            self.logger.error(f"Database check failed: {e}")
            return False
            
    def _check_auth(self) -> bool:
        """Check authentication system."""
        try:
            # Check if secret key is set
            return bool(settings.SECRET_KEY)
        except Exception as e:
            self.logger.error(f"Auth check failed: {e}")
            return False
            
    def _check_medication(self) -> bool:
        """Check medication system."""
        try:
            # Check if medication model is accessible
            Medication.query.limit(1).all()
            return True
        except Exception as e:
            self.logger.error(f"Medication check failed: {e}")
            return False
            
    def _check_notification(self) -> bool:
        """Check notification system."""
        try:
            # Check if email settings are configured
            return bool(settings.SMTP_HOST)
        except Exception as e:
            self.logger.error(f"Notification check failed: {e}")
            return False
            
monitoring_service = MonitoringService()
