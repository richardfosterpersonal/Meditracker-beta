import os
import sys
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def send_beta_notification(status, version, recipients):
    """Send notification to beta testers about new deployment."""
    
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    sender_email = os.getenv('NOTIFICATION_EMAIL')
    password = os.getenv('EMAIL_PASSWORD')

    subject = f"Medication Tracker Beta Update - {status.title()}"
    
    if status == 'success':
        body = f"""
        Dear Beta Tester,

        A new version of the Medication Tracker (Beta) has been deployed.

        Version: {version[:8]}
        Deployment Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

        What's New:
        - Latest features and improvements
        - Bug fixes and optimizations
        
        You can access the beta environment at: https://beta.medicationtracker.com

        Please report any issues or feedback through the beta feedback form 
        or email beta-support@medicationtracker.com

        Thank you for helping us improve Medication Tracker!

        Best regards,
        The Medication Tracker Team
        """
    else:
        body = f"""
        Alert: Beta Deployment Failed

        Version: {version[:8]}
        Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

        The beta deployment has failed. The team has been notified and is investigating.
        The current beta environment remains unchanged.

        For urgent issues, please contact the development team.
        """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, password)
            
            for recipient in recipients:
                msg['To'] = recipient
                server.send_message(msg)
                
        print(f"Successfully sent {status} notifications to {len(recipients)} recipients")
        return True
    except Exception as e:
        print(f"Failed to send notifications: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python beta_notification_handler.py <payload_file>")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        payload = json.load(f)

    # Load beta testers from environment or configuration
    beta_testers = os.getenv('BETA_TESTERS', '').split(',')
    if not beta_testers:
        print("No beta testers configured", file=sys.stderr)
        sys.exit(1)

    success = send_beta_notification(
        payload['status'],
        payload['version'],
        beta_testers
    )
    
    sys.exit(0 if success else 1)
