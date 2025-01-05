"""
Beta Alert Templates
Last Updated: 2024-12-26T23:14:27+01:00
"""

from typing import Dict
from datetime import datetime
from enum import Enum

class AlertTemplate(Enum):
    # Safety Alerts
    SAFETY_CRITICAL = "safety_critical"
    SAFETY_WARNING = "safety_warning"
    SAFETY_NOTICE = "safety_notice"
    
    # Critical Path Alerts
    PATH_VIOLATION = "path_violation"
    PATH_WARNING = "path_warning"
    PATH_REMINDER = "path_reminder"
    
    # System Alerts
    SYSTEM_CRITICAL = "system_critical"
    SYSTEM_WARNING = "system_warning"
    SYSTEM_MAINTENANCE = "system_maintenance"
    
    # User Alerts
    USER_SAFETY = "user_safety"
    USER_GUIDANCE = "user_guidance"
    USER_REMINDER = "user_reminder"

class BetaAlertTemplates:
    """Alert templates for beta testing phase"""
    
    @staticmethod
    def get_safety_template(alert_data: Dict) -> Dict:
        """Get safety alert template"""
        severity = alert_data.get("severity", "notice").lower()
        
        if severity == "critical":
            return {
                "title": "⚠️ CRITICAL SAFETY ALERT - Immediate Action Required",
                "message": f"""
                CRITICAL SAFETY ALERT
                
                Issue: {alert_data.get('description')}
                
                IMMEDIATE ACTIONS REQUIRED:
                1. Stop current medication activity
                2. Contact your healthcare provider
                3. Follow emergency procedures
                
                Emergency Contacts:
                - Medical Emergency: 911
                - Support Hotline: {alert_data.get('support_contact')}
                
                Your safety is our top priority.
                """,
                "action_required": True,
                "priority": "critical",
                "notification_channels": ["email", "sms", "push", "in_app"]
            }
            
        elif severity == "warning":
            return {
                "title": "⚠️ Safety Warning - Action Required",
                "message": f"""
                SAFETY WARNING
                
                Issue: {alert_data.get('description')}
                
                Required Actions:
                1. Review medication schedule
                2. Verify medication information
                3. Contact support if needed
                
                Support: {alert_data.get('support_contact')}
                """,
                "action_required": True,
                "priority": "high",
                "notification_channels": ["email", "push", "in_app"]
            }
            
        else:
            return {
                "title": "Safety Notice",
                "message": f"""
                SAFETY NOTICE
                
                Information: {alert_data.get('description')}
                
                Recommended Actions:
                1. Review safety guidelines
                2. Update emergency contacts if needed
                
                Contact support with questions.
                """,
                "action_required": False,
                "priority": "medium",
                "notification_channels": ["email", "in_app"]
            }
            
    @staticmethod
    def get_critical_path_template(alert_data: Dict) -> Dict:
        """Get critical path alert template"""
        alert_type = alert_data.get("type", "reminder").lower()
        
        if alert_type == "violation":
            return {
                "title": "🚫 Critical Path Violation - Action Required",
                "message": f"""
                CRITICAL PATH VIOLATION
                
                Issue: {alert_data.get('description')}
                
                Required Actions:
                1. Stop current activity
                2. Review validation requirements
                3. Contact beta support
                
                Your safety and compliance are essential.
                
                Support: {alert_data.get('support_contact')}
                """,
                "action_required": True,
                "priority": "high",
                "notification_channels": ["email", "push", "in_app"]
            }
            
        elif alert_type == "warning":
            return {
                "title": "⚠️ Critical Path Warning",
                "message": f"""
                CRITICAL PATH WARNING
                
                Warning: {alert_data.get('description')}
                
                Recommended Actions:
                1. Review current status
                2. Address identified issues
                3. Update validation status
                
                Contact support if needed.
                """,
                "action_required": True,
                "priority": "medium",
                "notification_channels": ["email", "in_app"]
            }
            
        else:
            return {
                "title": "Critical Path Reminder",
                "message": f"""
                CRITICAL PATH REMINDER
                
                Reminder: {alert_data.get('description')}
                
                Next Steps:
                1. Review requirements
                2. Update progress
                3. Validate changes
                
                Stay on track with beta requirements.
                """,
                "action_required": False,
                "priority": "low",
                "notification_channels": ["email", "in_app"]
            }
            
    @staticmethod
    def get_system_template(alert_data: Dict) -> Dict:
        """Get system alert template"""
        severity = alert_data.get("severity", "notice").lower()
        
        if severity == "critical":
            return {
                "title": "🔴 System Critical Alert",
                "message": f"""
                SYSTEM CRITICAL ALERT
                
                Issue: {alert_data.get('description')}
                
                System Status: Critical
                
                Actions:
                1. Save all work
                2. Follow emergency procedures
                3. Wait for all-clear signal
                
                Emergency Contact: {alert_data.get('support_contact')}
                """,
                "action_required": True,
                "priority": "critical",
                "notification_channels": ["email", "sms", "push", "in_app"]
            }
            
        elif severity == "warning":
            return {
                "title": "⚠️ System Warning",
                "message": f"""
                SYSTEM WARNING
                
                Warning: {alert_data.get('description')}
                
                Recommended Actions:
                1. Save work frequently
                2. Report any issues
                3. Follow support guidance
                
                Support: {alert_data.get('support_contact')}
                """,
                "action_required": True,
                "priority": "high",
                "notification_channels": ["email", "push", "in_app"]
            }
            
        else:
            return {
                "title": "System Maintenance Notice",
                "message": f"""
                SYSTEM MAINTENANCE
                
                Notice: {alert_data.get('description')}
                
                Actions:
                1. Save work before maintenance
                2. Check system status after
                
                Contact support with questions.
                """,
                "action_required": False,
                "priority": "medium",
                "notification_channels": ["email", "in_app"]
            }
            
    @staticmethod
    def get_user_template(alert_data: Dict) -> Dict:
        """Get user alert template"""
        alert_type = alert_data.get("type", "reminder").lower()
        
        if alert_type == "safety":
            return {
                "title": "⚠️ User Safety Alert",
                "message": f"""
                USER SAFETY ALERT
                
                Alert: {alert_data.get('description')}
                
                Required Actions:
                1. Review safety guidelines
                2. Update emergency contacts
                3. Verify medication information
                
                Your safety is important to us.
                
                Support: {alert_data.get('support_contact')}
                """,
                "action_required": True,
                "priority": "high",
                "notification_channels": ["email", "push", "in_app"]
            }
            
        elif alert_type == "guidance":
            return {
                "title": "Beta Testing Guidance",
                "message": f"""
                BETA GUIDANCE
                
                Information: {alert_data.get('description')}
                
                Recommended Steps:
                1. Review guidelines
                2. Complete required tasks
                3. Provide feedback
                
                Thank you for your participation.
                """,
                "action_required": False,
                "priority": "medium",
                "notification_channels": ["email", "in_app"]
            }
            
        else:
            return {
                "title": "Beta Testing Reminder",
                "message": f"""
                BETA REMINDER
                
                Reminder: {alert_data.get('description')}
                
                Next Steps:
                1. Check progress
                2. Complete pending tasks
                3. Update feedback
                
                Your input helps improve the system.
                """,
                "action_required": False,
                "priority": "low",
                "notification_channels": ["email", "in_app"]
            }
