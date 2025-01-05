"""Tests for the ReminderWorker class."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import redis
from rq.job import Job

from app.workers.reminder_worker import ReminderWorker
from app.domain.medication.entities import MedicationEntity
from app.core.config import Settings
from app.services.notification_service import NotificationService

@pytest.fixture
def mock_settings():
    """Mock application settings."""
    return Settings(
        NOTIFICATION_API_KEY="test-key",
        NOTIFICATION_API_URL="http://test-url",
        NOTIFICATION_MAX_RETRIES=3,
        MAX_REMINDERS_PER_15_MIN=5,
        REDIS_HOST="localhost",
        REDIS_PORT=6379,
        REDIS_PASSWORD="",
        REDIS_SSL=False
    )

@pytest.fixture
def mock_redis():
    """Mock Redis connection."""
    with patch('redis.Redis') as mock:
        yield mock

@pytest.fixture
def mock_notification_service():
    """Mock notification service."""
    with patch('app.services.notification_service.NotificationService') as mock:
        yield mock

@pytest.fixture
def mock_db():
    """Mock database session."""
    return Mock()

@pytest.fixture
def mock_medication_repository():
    """Mock medication repository."""
    return Mock()

@pytest.fixture
def reminder_worker(mock_redis, mock_notification_service, mock_db, mock_medication_repository, mock_settings):
    """Create a ReminderWorker instance with mocked dependencies."""
    with patch('app.workers.reminder_worker.get_db') as mock_get_db, \
         patch('app.workers.reminder_worker.SQLMedicationRepository') as mock_repo_class, \
         patch('app.workers.reminder_worker.get_settings') as mock_get_settings:
        
        mock_get_db.return_value = iter([mock_db])
        mock_repo_class.return_value = mock_medication_repository
        mock_get_settings.return_value = mock_settings
        
        worker = ReminderWorker()
        worker.redis_conn = mock_redis
        worker.queue = Mock()
        return worker

@pytest.fixture
def sample_medication():
    """Create a sample medication entity."""
    return MedicationEntity(
        id=1,
        user_id=1,
        name="Test Medication",
        dosage="10mg",
        schedule={
            "frequency": "daily",
            "times": ["09:00", "21:00"]
        },
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

class TestReminderWorker:
    """Test cases for ReminderWorker."""

    def test_init(self, reminder_worker):
        """Test worker initialization."""
        assert reminder_worker is not None
        assert reminder_worker.medication_repository is not None
        assert reminder_worker.notification_service is not None

    def test_redis_connection_failure(self, mock_redis):
        """Test handling of Redis connection failure."""
        mock_redis.side_effect = redis.RedisError("Connection failed")
        
        with pytest.raises(redis.RedisError):
            ReminderWorker()

    def test_process_reminders(self, reminder_worker, sample_medication):
        """Test processing of due reminders."""
        # Setup
        current_time = datetime.utcnow()
        reminder_worker.medication_repository.get_due_medications.return_value = [sample_medication]
        
        # Execute
        reminder_worker.process_reminders()
        
        # Verify
        reminder_worker.medication_repository.get_due_medications.assert_called_once()
        assert reminder_worker.queue.enqueue.called

    def test_rate_limiting(self, reminder_worker):
        """Test rate limiting functionality."""
        user_id = 1
        
        # First attempt should not be rate limited
        reminder_worker.redis_conn.get.return_value = None
        assert not reminder_worker._is_rate_limited(user_id)
        
        # Simulate max attempts
        reminder_worker.redis_conn.get.return_value = str(
            reminder_worker.settings.MAX_REMINDERS_PER_15_MIN
        )
        
        # Should be rate limited now
        assert reminder_worker._is_rate_limited(user_id)

    def test_create_notification_job(self, reminder_worker, sample_medication):
        """Test creation of notification job."""
        current_time = datetime.utcnow()
        mock_job = Mock(spec=Job)
        reminder_worker.queue.enqueue.return_value = mock_job

        job = reminder_worker._create_notification_job(sample_medication, current_time)

        assert job == mock_job
        reminder_worker.queue.enqueue.assert_called_once()

    def test_cleanup_old_jobs(self, reminder_worker):
        """Test cleanup of old jobs."""
        # Setup mock jobs
        mock_registry = Mock()
        reminder_worker.queue.finished_job_registry = mock_registry
        
        old_job = Mock(spec=Job)
        old_job.ended_at = datetime.utcnow() - timedelta(hours=25)
        
        recent_job = Mock(spec=Job)
        recent_job.ended_at = datetime.utcnow() - timedelta(hours=1)
        
        mock_registry.get_job_ids.return_value = ["old_job", "recent_job"]
        
        with patch('rq.job.Job.fetch') as mock_fetch:
            mock_fetch.side_effect = [old_job, recent_job]
            
            # Execute
            reminder_worker.cleanup_old_jobs()
            
            # Verify
            assert old_job.delete.called
            assert not recent_job.delete.called

    def test_process_medication_reminder_error(self, reminder_worker, sample_medication):
        """Test error handling in medication reminder processing."""
        current_time = datetime.utcnow()
        reminder_worker.queue.enqueue.side_effect = Exception("Test error")

        with pytest.raises(Exception):
            reminder_worker._process_medication_reminder(sample_medication, current_time)

    @patch('app.workers.reminder_worker.logger')
    def test_rate_limit_redis_error(self, mock_logger, reminder_worker):
        """Test handling of Redis errors in rate limiting."""
        reminder_worker.redis_conn.get.side_effect = redis.RedisError("Test error")
        
        # Should fail open (return False) when Redis errors
        assert not reminder_worker._is_rate_limited(1)
        mock_logger.error.assert_called_once()
