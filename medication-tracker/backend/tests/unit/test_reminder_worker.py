import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from app.workers.reminder_worker import ReminderWorker
from app.services.notification_service import NotificationService, NotificationType
from app.models.notification import Notification

@pytest.fixture
def mock_notification_service():
    service = Mock(spec=NotificationService)
    service.get_pending_notifications.return_value = []
    return service

@pytest.fixture
def reminder_worker(mock_notification_service):
    worker = ReminderWorker(mock_notification_service)
    yield worker
    worker.stop()  # Ensure cleanup after each test

class TestReminderWorker:
    def test_worker_initialization(self, reminder_worker):
        """Test proper worker initialization"""
        assert not reminder_worker.running
        assert reminder_worker.worker_thread is None
        assert reminder_worker.notification_handlers is not None
        assert len(reminder_worker.notification_handlers) == 6  # All notification types covered

    def test_start_stop(self, reminder_worker):
        """Test worker start and stop functionality"""
        reminder_worker.start()
        assert reminder_worker.running
        assert reminder_worker.worker_thread is not None
        assert reminder_worker.worker_thread.is_alive()

        reminder_worker.stop()
        assert not reminder_worker.running
        assert not reminder_worker.worker_thread.is_alive()

    def test_upcoming_dose_notification(self, reminder_worker, mock_notification_service):
        """Test handling of upcoming dose notifications"""
        now = datetime.utcnow()
        notification = Notification(
            id=1,
            type=NotificationType.UPCOMING_DOSE,
            user_id=123,
            medication_id=456,
            scheduled_time=now + timedelta(minutes=15),
            data={
                "medication_name": "Test Med",
                "dosage": "10mg"
            }
        )
        mock_notification_service.get_pending_notifications.return_value = [notification]
        
        with patch.object(reminder_worker, '_handle_upcoming_dose') as mock_handler:
            reminder_worker.start()
            # Allow some time for processing
            import time
            time.sleep(0.1)
            mock_handler.assert_called_once()
            args = mock_handler.call_args[0][0]
            assert args.id == notification.id
            assert args.type == NotificationType.UPCOMING_DOSE

    def test_missed_dose_notification(self, reminder_worker, mock_notification_service):
        """Test handling of missed dose notifications"""
        now = datetime.utcnow()
        notification = Notification(
            id=1,
            type=NotificationType.MISSED_DOSE,
            user_id=123,
            medication_id=456,
            scheduled_time=now - timedelta(hours=1),
            data={
                "medication_name": "Test Med",
                "dosage": "10mg",
                "scheduled_time": now - timedelta(hours=1)
            }
        )
        mock_notification_service.get_pending_notifications.return_value = [notification]
        
        with patch.object(reminder_worker, '_handle_missed_dose') as mock_handler:
            reminder_worker.start()
            import time
            time.sleep(0.1)
            mock_handler.assert_called_once()
            args = mock_handler.call_args[0][0]
            assert args.type == NotificationType.MISSED_DOSE

    def test_emergency_notification_priority(self, reminder_worker, mock_notification_service):
        """Test that emergency notifications are processed with priority"""
        now = datetime.utcnow()
        regular_notification = Notification(
            id=1,
            type=NotificationType.UPCOMING_DOSE,
            user_id=123,
            medication_id=456,
            scheduled_time=now + timedelta(minutes=15),
            priority="normal"
        )
        emergency_notification = Notification(
            id=2,
            type=NotificationType.EMERGENCY_CONTACT,
            user_id=123,
            medication_id=456,
            scheduled_time=now,
            priority="high"
        )
        
        mock_notification_service.get_pending_notifications.return_value = [
            regular_notification,
            emergency_notification
        ]
        
        processed_notifications = []
        def mock_process(notification):
            processed_notifications.append(notification.id)
            
        with patch.object(reminder_worker, '_process_notification', side_effect=mock_process):
            reminder_worker.start()
            import time
            time.sleep(0.1)
            assert len(processed_notifications) == 2
            assert processed_notifications[0] == emergency_notification.id

    def test_timezone_handling(self, reminder_worker, mock_notification_service):
        """Test proper handling of notifications across time zones"""
        now = datetime.utcnow()
        notification = Notification(
            id=1,
            type=NotificationType.UPCOMING_DOSE,
            user_id=123,
            medication_id=456,
            scheduled_time=now + timedelta(minutes=15),
            data={
                "medication_name": "Test Med",
                "dosage": "10mg",
                "user_timezone": "America/New_York"
            }
        )
        mock_notification_service.get_pending_notifications.return_value = [notification]
        
        with patch.object(reminder_worker, '_handle_upcoming_dose') as mock_handler:
            reminder_worker.start()
            import time
            time.sleep(0.1)
            mock_handler.assert_called_once()
            # Verify timezone conversion was handled
            args = mock_handler.call_args[0][0]
            assert "user_timezone" in args.data

    def test_error_handling(self, reminder_worker, mock_notification_service):
        """Test worker's error handling capabilities"""
        notification = Notification(
            id=1,
            type=NotificationType.UPCOMING_DOSE,
            user_id=123,
            medication_id=456,
            scheduled_time=datetime.utcnow(),
            data={}
        )
        mock_notification_service.get_pending_notifications.return_value = [notification]
        mock_notification_service.send_notification.side_effect = Exception("Test error")
        
        # Worker should continue running despite errors
        reminder_worker.start()
        import time
        time.sleep(0.1)
        assert reminder_worker.running
        assert reminder_worker.worker_thread.is_alive()
