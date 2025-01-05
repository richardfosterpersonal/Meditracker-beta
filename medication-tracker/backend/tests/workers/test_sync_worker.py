"""Tests for the SyncWorker class."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
import redis

from app.core.config import Settings
from app.domain.medication.entities import MedicationEntity
from app.domain.user.entities import User
from app.workers.sync_worker import SyncWorker

@pytest.fixture
def mock_settings():
    """Mock application settings."""
    return Settings(
        SYNC_BATCH_SIZE=100,
        SYNC_INTERVAL_MINUTES=15,
        SYNC_RETRY_ATTEMPTS=3,
        SYNC_RETRY_DELAY_SECONDS=60,
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
def mock_db():
    """Mock database session."""
    return Mock()

@pytest.fixture
def mock_medication_repository():
    """Mock medication repository."""
    return Mock()

@pytest.fixture
def mock_user_repository():
    """Mock user repository."""
    return Mock()

@pytest.fixture
def sync_worker(mock_redis, mock_db, mock_medication_repository, mock_user_repository, mock_settings):
    """Create a SyncWorker instance with mocked dependencies."""
    with patch('app.workers.sync_worker.get_db') as mock_get_db, \
         patch('app.workers.sync_worker.SQLMedicationRepository') as mock_repo_class, \
         patch('app.workers.sync_worker.SQLUserRepository') as mock_user_repo_class, \
         patch('app.workers.sync_worker.get_settings') as mock_get_settings:
        
        mock_get_db.return_value = iter([mock_db])
        mock_repo_class.return_value = mock_medication_repository
        mock_user_repo_class.return_value = mock_user_repository
        mock_get_settings.return_value = mock_settings
        
        worker = SyncWorker()
        worker.redis_conn = mock_redis
        return worker

class TestSyncWorker:
    """Test cases for SyncWorker."""

    def test_init(self, sync_worker):
        """Test worker initialization."""
        assert sync_worker is not None
        assert sync_worker.medication_repository is not None
        assert sync_worker.user_repository is not None

    def test_sync_user_data(self, sync_worker):
        """Test synchronization of user data."""
        mock_user = Mock(id=1, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
        sync_worker.user_repository.get_users_needing_sync.return_value = [mock_user]
        sync_worker.redis_conn.set.return_value = True  # Lock acquired successfully
        
        sync_worker.sync_user_data()
        
        sync_worker.user_repository.get_users_needing_sync.assert_called_once()
        sync_worker.medication_repository.sync_user_medications.assert_called_once_with(mock_user.id)

    def test_sync_batch_processing(self, sync_worker):
        """Test batch processing of synchronization."""
        # Create mock users
        mock_users = [
            Mock(id=i, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
            for i in range(1, 6)
        ]
        sync_worker.user_repository.get_users_needing_sync.return_value = mock_users
        sync_worker.redis_conn.set.return_value = True  # Lock acquired successfully
        
        sync_worker.sync_user_data()
        
        # Verify each user was processed
        assert sync_worker.medication_repository.sync_user_medications.call_count == len(mock_users)

    def test_sync_error_handling(self, sync_worker):
        """Test error handling during synchronization."""
        mock_user = Mock(id=1, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
        sync_worker.user_repository.get_users_needing_sync.return_value = [mock_user]
        sync_worker.redis_conn.set.return_value = True  # Lock acquired successfully
        sync_worker.medication_repository.sync_user_medications.side_effect = Exception("Sync failed")
        
        # Should not raise exception
        sync_worker.sync_user_data()
        
        # Verify retry attempts
        assert sync_worker.medication_repository.sync_user_medications.call_count == \
            sync_worker.settings.SYNC_RETRY_ATTEMPTS

    def test_sync_retry_success(self, sync_worker):
        """Test successful retry after initial failure."""
        mock_user = Mock(id=1, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
        sync_worker.user_repository.get_users_needing_sync.return_value = [mock_user]
        sync_worker.redis_conn.set.return_value = True  # Lock acquired successfully
        
        # Fail first attempt, succeed on second
        sync_worker.medication_repository.sync_user_medications.side_effect = [
            Exception("First attempt failed"),
            None  # Success
        ]
        
        sync_worker.sync_user_data()
        
        # Verify retry was successful
        assert sync_worker.medication_repository.sync_user_medications.call_count == 2

    def test_sync_lock_handling(self, sync_worker):
        """Test handling of sync locks to prevent duplicate processing."""
        mock_user = Mock(id=1, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
        sync_worker.user_repository.get_users_needing_sync.return_value = [mock_user]
        
        # Simulate lock already exists
        sync_worker.redis_conn.set.return_value = False
        
        sync_worker.sync_user_data()
        
        # Verify sync was not attempted due to lock
        sync_worker.medication_repository.sync_user_medications.assert_not_called()

    @patch('app.workers.sync_worker.logger')
    def test_sync_logging(self, mock_logger, sync_worker):
        """Test logging during synchronization process."""
        mock_user = Mock(id=1, last_sync=datetime.now(timezone.utc) - timedelta(hours=1))
        sync_worker.user_repository.get_users_needing_sync.return_value = [mock_user]
        sync_worker.redis_conn.set.return_value = True  # Lock acquired successfully
        
        sync_worker.sync_user_data()
        
        # Verify logging calls
        assert mock_logger.info.called
        assert mock_logger.error.call_count == 0
