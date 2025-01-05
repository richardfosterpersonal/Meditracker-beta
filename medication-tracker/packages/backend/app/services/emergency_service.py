from datetime import datetime, timedelta
import pytz
import secrets
from typing import Dict, List, Optional
from app.models.user import User
from app.models.medication import Medication
from app.models.notification import Notification
from app.services.notification_service import NotificationService
from app.core.monitoring import monitor, track_timing, log_error, EmergencyMetrics

class EmergencyService:
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service
        self.metrics = EmergencyMetrics()
        self.emergency_levels = {
            0: {
                "name": "normal",
                "actions": ["notify_user"]
            },
            1: {
                "name": "alert",
                "actions": ["notify_user", "notify_family"]
            },
            2: {
                "name": "urgent",
                "actions": ["notify_user", "notify_family", "notify_provider"]
            },
            3: {
                "name": "emergency",
                "actions": ["notify_all", "activate_emergency_access"]
            }
        }

    @monitor(metric_name="emergency_missed_dose")
    @track_timing("emergency_response_time")
    def handle_missed_dose(
        self,
        user_id: int,
        medication_id: int,
        scheduled_time: datetime,
        current_time: datetime
    ) -> Dict:
        """Handle a missed medication dose"""
        try:
            # Get user and medication
            user = User.query.get(user_id)
            medication = Medication.query.get(medication_id)
            
            if not user or not medication:
                self.metrics.increment("emergency_invalid_user_medication")
                return {"status": "error", "message": "User or medication not found"}
                
            # Calculate delay
            delay = current_time - scheduled_time
            max_delay = timedelta(minutes=medication.schedule.get("max_delay", 60))
            
            # Get current emergency status
            status = self.get_emergency_status(user_id, medication_id)
            escalation_level = status["escalation_level"]
            
            # Track delay metrics
            self.metrics.observe("dose_delay_minutes", delay.total_seconds() / 60)
            
            # Determine if emergency protocols should be activated
            if delay > max_delay or medication.is_critical:
                escalation_level = min(3, escalation_level + 1)
                self.metrics.increment(f"emergency_escalation_level_{escalation_level}")
                
                # Get required actions for this level
                actions = self.emergency_levels[escalation_level]["actions"]
                
                # Execute actions
                notifications_sent = []
                contacted_numbers = set()
                
                for action in actions:
                    if action == "notify_user":
                        notif = self.notification_service.send_notification(
                            user_id=user_id,
                            type="missed_dose",
                            medication_id=medication_id,
                            urgency="high"
                        )
                        notifications_sent.append(notif)
                        contacted_numbers.add(user.phone)
                        self.metrics.increment("emergency_user_notified")
                        
                    elif action == "notify_family":
                        family_notifs = self.notify_emergency_contacts(
                            user_id=user_id,
                            medication_id=medication_id,
                            reason="missed_critical_dose"
                        )
                        notifications_sent.extend(family_notifs)
                        contacted_numbers.update(
                            contact["phone"] 
                            for contact in user.emergency_contacts
                        )
                        self.metrics.increment("emergency_family_notified")
                        
                    elif action == "notify_provider":
                        provider_response = self.notify_healthcare_providers(
                            user_id=user_id,
                            medication_id=medication_id,
                            reason="missed_critical_dose"
                        )
                        contacted_numbers.update(
                            provider["phone"]
                            for provider in user.healthcare_providers
                        )
                        self.metrics.increment("emergency_provider_notified")
                        
                    elif action == "activate_emergency_access":
                        self.generate_emergency_access(
                            user_id=user_id,
                            reason="missed_critical_dose"
                        )
                        self.metrics.increment("emergency_access_activated")
                
                return {
                    "status": "emergency_activated",
                    "level": self.emergency_levels[escalation_level]["name"],
                    "notifications_sent": bool(notifications_sent),
                    "contacted_numbers": list(contacted_numbers)
                }
                
            self.metrics.increment("emergency_monitored")
            return {
                "status": "monitored",
                "level": self.emergency_levels[0]["name"]
            }
            
        except Exception as e:
            log_error("Error handling missed dose", e, {
                "user_id": user_id,
                "medication_id": medication_id
            })
            self.metrics.increment("emergency_handling_error")
            return {"status": "error", "message": "Internal error"}

    @monitor(metric_name="emergency_contact_notify")
    @track_timing("emergency_contact_time")
    def notify_emergency_contacts(
        self,
        user_id: int,
        medication_id: int,
        reason: str
    ) -> List[Notification]:
        """Notify emergency contacts"""
        try:
            user = User.query.get(user_id)
            medication = Medication.query.get(medication_id)
            
            if not user or not medication:
                self.metrics.increment("emergency_contact_invalid_data")
                return []
                
            notifications = []
            contacts_notified = 0
            
            for contact in user.emergency_contacts:
                if reason in contact.get("notify_on", []):
                    # Send SMS
                    if contact.get("phone"):
                        sms = self.notification_service.send_notification(
                            user_id=user_id,
                            type="emergency_contact_sms",
                            contact_phone=contact["phone"],
                            medication_id=medication_id,
                            urgency="high"
                        )
                        notifications.append(sms)
                        contacts_notified += 1
                        self.metrics.increment("emergency_contact_sms_sent")
                        
                    # Send Email
                    if contact.get("email"):
                        email = self.notification_service.send_notification(
                            user_id=user_id,
                            type="emergency_contact_email",
                            contact_email=contact["email"],
                            medication_id=medication_id,
                            urgency="high"
                        )
                        notifications.append(email)
                        contacts_notified += 1
                        self.metrics.increment("emergency_contact_email_sent")
            
            self.metrics.increment("emergency_contacts_notified", value=contacts_notified)
            return notifications
            
        except Exception as e:
            log_error("Error notifying emergency contacts", e, {
                "user_id": user_id,
                "medication_id": medication_id
            })
            self.metrics.increment("emergency_contact_error")
            return []

    @monitor(metric_name="emergency_provider_notify")
    @track_timing("emergency_provider_time")
    def notify_healthcare_providers(
        self,
        user_id: int,
        medication_id: int,
        reason: str
    ) -> Dict:
        """Notify healthcare providers"""
        try:
            user = User.query.get(user_id)
            medication = Medication.query.get(medication_id)
            
            if not user or not medication:
                self.metrics.increment("emergency_provider_invalid_data")
                return {"status": "error", "message": "User or medication not found"}
                
            notified_providers = []
            providers_notified = 0
            
            for provider in user.healthcare_providers:
                if reason in provider.get("notify_on", []):
                    # Send notifications
                    if provider.get("phone"):
                        self.notification_service.send_notification(
                            user_id=user_id,
                            type="provider_alert",
                            contact_phone=provider["phone"],
                            medication_id=medication_id,
                            urgency="high"
                        )
                        providers_notified += 1
                        self.metrics.increment("emergency_provider_phone_notified")
                        
                    if provider.get("email"):
                        self.notification_service.send_notification(
                            user_id=user_id,
                            type="provider_alert",
                            contact_email=provider["email"],
                            medication_id=medication_id,
                            urgency="high"
                        )
                        providers_notified += 1
                        self.metrics.increment("emergency_provider_email_notified")
                    
                    notified_providers.append(provider["name"])
            
            self.metrics.increment("emergency_providers_notified", value=providers_notified)
            return {
                "status": "notified",
                "notified_providers": notified_providers
            }
            
        except Exception as e:
            log_error("Error notifying healthcare providers", e, {
                "user_id": user_id,
                "medication_id": medication_id
            })
            self.metrics.increment("emergency_provider_error")
            return {"status": "error", "message": "Internal error"}

    @monitor(metric_name="emergency_access_generate")
    @track_timing("emergency_access_time")
    def generate_emergency_access(
        self,
        user_id: int,
        reason: str,
        duration_hours: int = 24
    ) -> Dict:
        """Generate emergency access code"""
        try:
            user = User.query.get(user_id)
            if not user:
                self.metrics.increment("emergency_access_invalid_user")
                return {"status": "error", "message": "User not found"}
                
            # Generate secure random code
            code = secrets.token_urlsafe(16)
            expires_at = datetime.now(pytz.UTC) + timedelta(hours=duration_hours)
            
            # Store emergency access
            user.emergency_access = {
                "code": code,
                "reason": reason,
                "created_at": datetime.now(pytz.UTC).isoformat(),
                "expires_at": expires_at.isoformat()
            }
            
            self.metrics.increment("emergency_access_generated")
            return {
                "code": code,
                "expires_at": expires_at
            }
            
        except Exception as e:
            log_error("Error generating emergency access", e, {
                "user_id": user_id
            })
            self.metrics.increment("emergency_access_error")
            return {"status": "error", "message": "Internal error"}

    @monitor(metric_name="emergency_access_verify")
    @track_timing("emergency_access_verify_time")
    def verify_emergency_access(
        self,
        user_id: int,
        access_code: str
    ) -> Dict:
        """Verify emergency access code"""
        try:
            user = User.query.get(user_id)
            if not user or not user.emergency_access:
                self.metrics.increment("emergency_access_invalid_code")
                return {"valid": False, "message": "No emergency access found"}
                
            stored_code = user.emergency_access.get("code")
            expires_at = datetime.fromisoformat(user.emergency_access.get("expires_at"))
            
            if stored_code == access_code and expires_at > datetime.now(pytz.UTC):
                self.metrics.increment("emergency_access_valid")
                return {
                    "valid": True,
                    "access_level": "emergency",
                    "expires_at": expires_at
                }
            
            self.metrics.increment("emergency_access_invalid")
            return {"valid": False, "message": "Invalid or expired code"}
            
        except Exception as e:
            log_error("Error verifying emergency access", e, {
                "user_id": user_id
            })
            self.metrics.increment("emergency_access_verify_error")
            return {"valid": False, "message": "Internal error"}

    @monitor(metric_name="emergency_status_get")
    @track_timing("emergency_status_time")
    def get_emergency_status(
        self,
        user_id: int,
        medication_id: int
    ) -> Dict:
        """Get current emergency status for a medication"""
        try:
            user = User.query.get(user_id)
            medication = Medication.query.get(medication_id)
            
            if not user or not medication:
                self.metrics.increment("emergency_status_invalid_data")
                return {
                    "escalation_level": 0,
                    "missed_doses": 0
                }
                
            # Count recent missed doses
            missed_doses = len([
                dose for dose in medication.missed_doses
                if dose["time"] > (datetime.now(pytz.UTC) - timedelta(days=1))
            ])
            
            # Calculate escalation level
            escalation_level = min(3, missed_doses)
            if medication.is_critical:
                escalation_level = max(1, escalation_level)
            
            self.metrics.increment("emergency_status_retrieved")
            return {
                "escalation_level": escalation_level,
                "missed_doses": missed_doses
            }
            
        except Exception as e:
            log_error("Error getting emergency status", e, {
                "user_id": user_id,
                "medication_id": medication_id
            })
            self.metrics.increment("emergency_status_error")
            return {
                "escalation_level": 0,
                "missed_doses": 0
            }
