import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
from .email_templates import EmailTemplates
from ..models.notification import Notification
from datetime import datetime
import threading
import queue
import time

class EmailService:
    def __init__(self):
        self.email_queue = queue.Queue()
        self.worker_thread = None
        self.running = False
        self.rate_limit = {}  # Store last email timestamp per user
        self.min_interval = 300  # Minimum 5 minutes between emails per user
        self.batch_notifications = {}  # Store notifications for batching
        self.batch_interval = 900  # 15 minutes batching window
        
    def start(self):
        """Start the email worker thread"""
        if not self.running:
            self.running = True
            self.worker_thread = threading.Thread(target=self._process_email_queue)
            self.worker_thread.daemon = True
            self.worker_thread.start()
    
    def stop(self):
        """Stop the email worker thread"""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join()
    
    def _process_email_queue(self):
        """Process emails in the queue with batching"""
        while self.running:
            try:
                # Process batched notifications
                current_time = time.time()
                for user_email, batch in list(self.batch_notifications.items()):
                    if current_time - batch['timestamp'] >= self.batch_interval:
                        self._send_batched_email(user_email, batch['notifications'])
                        del self.batch_notifications[user_email]

                # Get email from queue with timeout
                email_data = self.email_queue.get(timeout=1)
                if email_data:
                    self._handle_email_data(email_data)
                self.email_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                current_app.logger.error(f"Error processing email: {str(e)}")
                time.sleep(1)  # Prevent tight loop on persistent errors
    
    def _handle_email_data(self, email_data):
        """Handle email data with batching logic"""
        to_email = email_data['to_email']
        current_time = time.time()

        # Check if we should start batching
        if to_email not in self.batch_notifications:
            self.batch_notifications[to_email] = {
                'timestamp': current_time,
                'notifications': [email_data]
            }
        else:
            # Add to existing batch
            self.batch_notifications[to_email]['notifications'].append(email_data)
            
            # Send immediately if batch is full
            if len(self.batch_notifications[to_email]['notifications']) >= 5:
                self._send_batched_email(to_email, self.batch_notifications[to_email]['notifications'])
                del self.batch_notifications[to_email]

    def _send_batched_email(self, to_email, notifications):
        """Send a batched email containing multiple notifications"""
        try:
            # Group notifications by type
            notifications_by_type = {}
            for n in notifications:
                n_type = n.get('notification_type', 'general')
                if n_type not in notifications_by_type:
                    notifications_by_type[n_type] = []
                notifications_by_type[n_type].append(n)

            # Create combined HTML content
            html_content = "<h2>Your Medication Updates</h2>"
            for n_type, n_list in notifications_by_type.items():
                html_content += f"<h3>{n_type.replace('_', ' ').title()}</h3><ul>"
                for n in n_list:
                    html_content += f"<li>{n['html_content']}</li>"
                html_content += "</ul>"

            # Send combined email
            self._send_email(
                to_email=to_email,
                subject="Medication Updates",
                html_content=html_content,
                notification_id=None  # No single notification ID for batched emails
            )

            # Mark all notifications as sent
            for n in notifications:
                if n.get('notification_id'):
                    notification = Notification.query.get(n['notification_id'])
                    if notification:
                        notification.mark_as_sent()

        except Exception as e:
            current_app.logger.error(f"Error sending batched email: {str(e)}")
            # Mark notifications as failed
            for n in notifications:
                if n.get('notification_id'):
                    notification = Notification.query.get(n['notification_id'])
                    if notification:
                        notification.mark_as_failed(str(e))
    
    def _send_email(self, to_email, subject, html_content, notification_id=None):
        """Send an email using SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP_SSL(current_app.config['MAIL_SERVER'], 
                                current_app.config['MAIL_PORT']) as server:
                server.login(current_app.config['MAIL_USERNAME'],
                           current_app.config['MAIL_PASSWORD'])
                server.send_message(msg)
            
            if notification_id:
                notification = Notification.query.get(notification_id)
                if notification:
                    notification.mark_as_sent()
                    
            current_app.logger.info(f"Email sent successfully to {to_email}")
            
        except Exception as e:
            current_app.logger.error(f"Failed to send email to {to_email}: {str(e)}")
            if notification_id:
                notification = Notification.query.get(notification_id)
                if notification:
                    notification.mark_as_failed(str(e))
            raise
    
    def queue_email(self, to_email, subject, html_content, notification_id=None):
        """Add an email to the sending queue with rate limiting"""
        current_time = time.time()
        
        # Check rate limit
        if to_email in self.rate_limit:
            time_since_last = current_time - self.rate_limit[to_email]
            if time_since_last < self.min_interval:
                current_app.logger.warning(
                    f"Rate limit exceeded for {to_email}. Skipping email."
                )
                return
        
        # Update last email timestamp
        self.rate_limit[to_email] = current_time
        
        # Add to queue
        self.email_queue.put({
            'to_email': to_email,
            'subject': subject,
            'html_content': html_content,
            'notification_id': notification_id
        })
    
    def send_notification_email(self, notification, user):
        """Send an email for a notification"""
        try:
            base_url = current_app.config['BASE_URL']
            template_data = {
                'user_name': user.name,
                'base_url': base_url,
                'action_url': f"{base_url}/notifications/{notification.id}"
            }
            
            if notification.medication:
                template_data['medication'] = notification.medication
            
            if notification.data:
                template_data.update(notification.data)
            
            # Select template based on notification type
            if notification.type == 'UPCOMING_DOSE':
                template = EmailTemplates.upcoming_dose_template
                subject = "Medication Reminder"
            elif notification.type == 'MISSED_DOSE':
                template = EmailTemplates.missed_dose_template
                subject = "Missed Medication Alert"
            elif notification.type == 'INTERACTION_WARNING':
                template = EmailTemplates.interaction_warning_template
                subject = "Medication Interaction Warning"
            elif notification.type == 'REFILL_REMINDER':
                template = EmailTemplates.refill_reminder_template
                subject = "Medication Refill Reminder"
            else:
                raise ValueError(f"Unknown notification type: {notification.type}")
            
            html_content = EmailTemplates.render_template(
                template,
                title=subject,
                **template_data
            )
            
            self.queue_email(
                to_email=user.email,
                subject=subject,
                html_content=html_content,
                notification_id=notification.id
            )
            
            current_app.logger.info(
                f"Queued {notification.type} email for user {user.id}"
            )
            
        except Exception as e:
            current_app.logger.error(
                f"Error preparing notification email: {str(e)}"
            )
            notification.mark_as_failed(str(e))
            raise

# Create a singleton instance
email_service = EmailService()
