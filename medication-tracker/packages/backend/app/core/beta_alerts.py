"""
Beta Monitoring Alerts System
Last Updated: 2024-12-26T23:11:31+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
import asyncio
from .logging import beta_logger
from .validation_metrics import ValidationMetrics
from .critical_validation import CriticalValidation
from ..services.email_service import EmailService
from ..services.notification_service import NotificationService
from ..services.alert_service import AlertService

class AlertPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    SAFETY = "safety"
    CRITICAL_PATH = "critical_path"
    SYSTEM = "system"
    USER = "user"

class BetaAlerts:
    """
    Manages beta monitoring alerts and notifications
    Ensures critical path compliance and safety alerts
    """
    
    def __init__(self):
        self.logger = beta_logger
        self.validation_metrics = ValidationMetrics()
        self.critical_validation = CriticalValidation()
        self.email_service = EmailService()
        self.notification_service = NotificationService()
        self.alert_service = AlertService()
        
    async def process_safety_alert(
        self,
        alert_data: Dict,
        priority: AlertPriority = AlertPriority.HIGH
    ) -> Dict:
        """Process safety-related alert"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                f"safety_alert_{alert_data.get('id')}",
                priority
            )
            
            # Validate alert data
            validation = await self._validate_alert_data(
                alert_data,
                AlertType.SAFETY
            )
            
            if not validation["valid"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Invalid safety alert data",
                    validation["details"]
                )
                
            # Process alert
            processed = await self._process_alert(alert_data, AlertType.SAFETY)
            if not processed["success"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Failed to process safety alert",
                    processed["error"]
                )
                
            # Send notifications
            notifications = await self._send_alert_notifications(
                alert_data,
                AlertType.SAFETY
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "processed",
                "validation_id": validation_id,
                "notifications": notifications,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "safety_alert_processing_failed",
                error=str(e),
                alert_id=alert_data.get("id")
            )
            raise
            
    async def process_critical_path_alert(
        self,
        alert_data: Dict,
        priority: AlertPriority = AlertPriority.HIGH
    ) -> Dict:
        """Process critical path alert"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                f"critical_path_alert_{alert_data.get('id')}",
                priority
            )
            
            # Validate alert data
            validation = await self._validate_alert_data(
                alert_data,
                AlertType.CRITICAL_PATH
            )
            
            if not validation["valid"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Invalid critical path alert data",
                    validation["details"]
                )
                
            # Process alert
            processed = await self._process_alert(alert_data, AlertType.CRITICAL_PATH)
            if not processed["success"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Failed to process critical path alert",
                    processed["error"]
                )
                
            # Send notifications
            notifications = await self._send_alert_notifications(
                alert_data,
                AlertType.CRITICAL_PATH
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "processed",
                "validation_id": validation_id,
                "notifications": notifications,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "critical_path_alert_processing_failed",
                error=str(e),
                alert_id=alert_data.get("id")
            )
            raise
            
    async def process_system_alert(
        self,
        alert_data: Dict,
        priority: AlertPriority = AlertPriority.MEDIUM
    ) -> Dict:
        """Process system-related alert"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                f"system_alert_{alert_data.get('id')}",
                priority
            )
            
            # Validate alert data
            validation = await self._validate_alert_data(
                alert_data,
                AlertType.SYSTEM
            )
            
            if not validation["valid"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Invalid system alert data",
                    validation["details"]
                )
                
            # Process alert
            processed = await self._process_alert(alert_data, AlertType.SYSTEM)
            if not processed["success"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Failed to process system alert",
                    processed["error"]
                )
                
            # Send notifications
            notifications = await self._send_alert_notifications(
                alert_data,
                AlertType.SYSTEM
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "processed",
                "validation_id": validation_id,
                "notifications": notifications,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "system_alert_processing_failed",
                error=str(e),
                alert_id=alert_data.get("id")
            )
            raise
            
    async def process_user_alert(
        self,
        alert_data: Dict,
        priority: AlertPriority = AlertPriority.MEDIUM
    ) -> Dict:
        """Process user-related alert"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                f"user_alert_{alert_data.get('id')}",
                priority
            )
            
            # Validate alert data
            validation = await self._validate_alert_data(
                alert_data,
                AlertType.USER
            )
            
            if not validation["valid"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Invalid user alert data",
                    validation["details"]
                )
                
            # Process alert
            processed = await self._process_alert(alert_data, AlertType.USER)
            if not processed["success"]:
                return self._handle_alert_failure(
                    validation_id,
                    "Failed to process user alert",
                    processed["error"]
                )
                
            # Send notifications
            notifications = await self._send_alert_notifications(
                alert_data,
                AlertType.USER
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "processed",
                "validation_id": validation_id,
                "notifications": notifications,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "user_alert_processing_failed",
                error=str(e),
                alert_id=alert_data.get("id")
            )
            raise
            
    # Helper methods
    async def _start_validation_chain(
        self,
        operation: str,
        priority: AlertPriority
    ) -> str:
        """Start validation chain for alert processing"""
        return await self.critical_validation.start_validation(operation, priority.value)
        
    async def _complete_validation_chain(
        self,
        validation_id: str,
        status: str
    ) -> None:
        """Complete validation chain"""
        await self.critical_validation.complete_validation(validation_id, status)
        
    def _handle_alert_failure(
        self,
        validation_id: str,
        reason: str,
        details: Dict
    ) -> Dict:
        """Handle alert processing failure"""
        return {
            "status": "failed",
            "validation_id": validation_id,
            "reason": reason,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    async def _validate_alert_data(
        self,
        alert_data: Dict,
        alert_type: AlertType
    ) -> Dict:
        """Validate alert data"""
        return await self.critical_validation.validate_alert(alert_data, alert_type.value)
        
    async def _process_alert(
        self,
        alert_data: Dict,
        alert_type: AlertType
    ) -> Dict:
        """Process alert based on type"""
        return await self.alert_service.process_alert(alert_data, alert_type.value)
        
    async def _send_alert_notifications(
        self,
        alert_data: Dict,
        alert_type: AlertType
    ) -> Dict:
        """Send alert notifications"""
        try:
            # Send email notifications
            email_sent = await self.email_service.send_alert_email(
                alert_data,
                alert_type.value
            )
            
            # Send push notifications
            push_sent = await self.notification_service.send_alert_notification(
                alert_data,
                alert_type.value
            )
            
            return {
                "email": email_sent,
                "push": push_sent,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "alert_notification_failed",
                error=str(e),
                alert_id=alert_data.get("id")
            )
            return {
                "email": False,
                "push": False,
                "error": str(e)
            }
