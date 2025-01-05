import os
import time
from datetime import datetime, timedelta
from app import create_app, db
from app.models.notification import Notification
from app.services.notification_scheduler import NotificationScheduler

def process_notifications():
    """Process notifications that are due"""
    try:
        # Get all notifications that are scheduled and due
        notifications = Notification.query.filter(
            Notification.status == 'scheduled',
            Notification.scheduled_time <= datetime.utcnow()
        ).all()

        for notification in notifications:
            try:
                # Mark as sent
                notification.mark_as_sent()
                print(f"Processed notification {notification.id} of type {notification.type}")
            except Exception as e:
                notification.mark_as_failed(str(e))
                print(f"Failed to process notification {notification.id}: {str(e)}")

    except Exception as e:
        print(f"Error processing notifications: {str(e)}")

def clean_old_notifications():
    """Clean up old notifications"""
    try:
        NotificationScheduler.clean_old_notifications()
        print("Cleaned old notifications")
    except Exception as e:
        print(f"Error cleaning old notifications: {str(e)}")

def schedule_notifications():
    """Schedule new notifications"""
    try:
        NotificationScheduler.schedule_notifications()
        print("Scheduled new notifications")
    except Exception as e:
        print(f"Error scheduling notifications: {str(e)}")

def run_worker():
    """Main worker function"""
    app = create_app()
    with app.app_context():
        while True:
            print(f"\nNotification worker running at {datetime.utcnow()}")
            
            # Process due notifications
            process_notifications()
            
            # Schedule new notifications every hour
            if datetime.utcnow().minute == 0:
                schedule_notifications()
                clean_old_notifications()
            
            # Sleep for a minute before next check
            time.sleep(60)

if __name__ == '__main__':
    run_worker()
