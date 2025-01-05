"""
Beta Onboarding Email Templates
Last Updated: 2024-12-26T23:03:51+01:00
"""

from typing import Dict
from datetime import datetime

class BetaOnboardingTemplates:
    """Email templates for beta onboarding process"""
    
    @staticmethod
    def welcome_email(user_data: Dict) -> Dict:
        """Welcome email template"""
        return {
            "subject": "Welcome to MediTracker Pro Beta!",
            "content": f"""
            Dear {user_data['name']},
            
            Welcome to the MediTracker Pro Beta Program! We're excited to have you help us make medication management safer and more efficient.
            
            Important Safety Information:
            - This is a beta version of the application
            - Continue following your healthcare provider's instructions
            - In case of emergency, always call emergency services first
            
            Your Next Steps:
            1. Check your email in 24 hours for important documentation
            2. Complete account setup using the link below
            3. Begin the guided setup process
            
            Account Setup: [SETUP_LINK]
            
            Support Contacts:
            - Email: beta-support@meditracker.com
            - Emergency: 1-800-MEDI-HELP
            
            Best regards,
            The MediTracker Pro Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "high"
        }
        
    @staticmethod
    def documentation_email(user_data: Dict) -> Dict:
        """Documentation package email template"""
        return {
            "subject": "MediTracker Pro Beta - Important Documentation",
            "content": f"""
            Dear {user_data['name']},
            
            Here's your MediTracker Pro Beta documentation package:
            
            1. Safety Guidelines:
               - Emergency procedures
               - Safety features guide
               - Risk management
            
            2. User Guide:
               - Getting started
               - Core features
               - Best practices
            
            3. Beta Program Information:
               - Program timeline
               - Feedback procedures
               - Support channels
            
            4. Privacy & Security:
               - Data protection
               - HIPAA compliance
               - Security measures
            
            Please review all documents carefully before proceeding with setup.
            
            Next Steps:
            1. Review documentation
            2. Complete account setup
            3. Start medication entry
            
            Questions? Contact beta-support@meditracker.com
            
            Best regards,
            The MediTracker Pro Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "high"
        }
        
    @staticmethod
    def setup_reminder(user_data: Dict) -> Dict:
        """Setup reminder email template"""
        return {
            "subject": "Complete Your MediTracker Pro Setup",
            "content": f"""
            Dear {user_data['name']},
            
            This is a reminder to complete your MediTracker Pro Beta setup.
            
            Pending Steps:
            {user_data['pending_steps']}
            
            Safety Note:
            Complete setup is essential for proper medication management.
            
            Need Help?
            - View tutorial: [TUTORIAL_LINK]
            - Contact support: beta-support@meditracker.com
            
            Best regards,
            The MediTracker Pro Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "medium"
        }
        
    @staticmethod
    def training_complete(user_data: Dict) -> Dict:
        """Training completion email template"""
        return {
            "subject": "MediTracker Pro Training Complete!",
            "content": f"""
            Dear {user_data['name']},
            
            Congratulations on completing your MediTracker Pro training!
            
            Completed Modules:
            {user_data['completed_modules']}
            
            Safety Verification:
            - All critical features reviewed
            - Emergency procedures understood
            - Safety features activated
            
            Next Steps:
            1. Start using MediTracker Pro
            2. Complete daily check-ins
            3. Provide feedback
            
            Remember: Safety First!
            
            Best regards,
            The MediTracker Pro Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "medium"
        }
        
    @staticmethod
    def safety_alert(user_data: Dict, alert_data: Dict) -> Dict:
        """Safety alert email template"""
        return {
            "subject": "Important Safety Alert - MediTracker Pro",
            "content": f"""
            Dear {user_data['name']},
            
            IMPORTANT SAFETY ALERT
            
            Alert Type: {alert_data['type']}
            Priority: {alert_data['priority']}
            
            Action Required:
            {alert_data['action_required']}
            
            Safety Instructions:
            {alert_data['instructions']}
            
            Contact emergency services if needed: 911
            
            Support Available 24/7:
            - Emergency: 1-800-MEDI-HELP
            - Email: emergency@meditracker.com
            
            Best regards,
            The MediTracker Pro Safety Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "critical"
        }
        
    @staticmethod
    def graduation_notification(user_data: Dict) -> Dict:
        """Beta graduation email template"""
        return {
            "subject": "Congratulations - MediTracker Pro Beta Graduation",
            "content": f"""
            Dear {user_data['name']},
            
            Congratulations on completing the MediTracker Pro Beta Program!
            
            Your Achievements:
            - Days Active: {user_data['days_active']}
            - Safety Score: {user_data['safety_score']}
            - Features Mastered: {user_data['features_mastered']}
            
            Next Steps:
            1. Transition to full release
            2. Review new features
            3. Continue providing feedback
            
            Thank you for your valuable contribution!
            
            Best regards,
            The MediTracker Pro Team
            """,
            "timestamp": datetime.utcnow().isoformat(),
            "priority": "high"
        }
