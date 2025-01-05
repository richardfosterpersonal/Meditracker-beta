"""Worker for synchronizing user medication data."""

import logging
import time
from datetime import datetime, timedelta, timezone
import redis
from typing import List, Optional

from app.core.config import Settings, get_settings
from app.infrastructure.database.database import get_db
from app.infrastructure.repositories.medication_repository import SQLMedicationRepository
from app.infrastructure.repositories.user_repository import SQLUserRepository
from app.domain.user.entities import User

logger = logging.getLogger(__name__)

class SyncWorker:
    """Worker responsible for synchronizing user medication data."""

    def __init__(self):
        """Initialize the SyncWorker with its dependencies."""
        self.settings: Settings = get_settings()
        
        # Initialize Redis connection
        self.redis_conn = redis.Redis(
            host=self.settings.REDIS_HOST,
            port=self.settings.REDIS_PORT,
            password=self.settings.REDIS_PASSWORD,
            ssl=self.settings.REDIS_SSL,
            decode_responses=True
        )
        
        # Initialize repositories
        db = next(get_db())
        self.medication_repository = SQLMedicationRepository(db)
        self.user_repository = SQLUserRepository(db)

    def _get_sync_lock(self, user_id: int) -> bool:
        """
        Attempt to acquire a sync lock for a user.
        
        Args:
            user_id: The ID of the user to lock
            
        Returns:
            bool: True if lock was acquired, False otherwise
        """
        lock_key = f"sync_lock:{user_id}"
        lock_duration = self.settings.SYNC_INTERVAL_MINUTES * 60  # Convert to seconds
        
        # Try to set the lock with NX (only if it doesn't exist)
        return bool(self.redis_conn.set(lock_key, "1", ex=lock_duration, nx=True))

    def _release_sync_lock(self, user_id: int) -> None:
        """
        Release the sync lock for a user.
        
        Args:
            user_id: The ID of the user whose lock to release
        """
        lock_key = f"sync_lock:{user_id}"
        self.redis_conn.delete(lock_key)

    def sync_user_data(self) -> None:
        """
        Synchronize medication data for users who need updates.
        
        This method:
        1. Retrieves users who haven't been synced recently
        2. Processes them in batches
        3. Handles retries for failed syncs
        4. Uses Redis locks to prevent duplicate processing
        """
        try:
            users_to_sync = self.user_repository.get_users_needing_sync(
                batch_size=self.settings.SYNC_BATCH_SIZE,
                sync_interval_minutes=self.settings.SYNC_INTERVAL_MINUTES
            )
            
            for user in users_to_sync:
                if not self._get_sync_lock(user.id):
                    logger.info(f"Sync already in progress for user {user.id}")
                    continue
                
                try:
                    self._sync_single_user(user)
                finally:
                    self._release_sync_lock(user.id)
                    
        except Exception as e:
            logger.error(f"Error in sync_user_data: {str(e)}")
            raise

    def _sync_single_user(self, user: User) -> None:
        """
        Synchronize data for a single user with retry logic.
        
        Args:
            user: The user whose data needs to be synced
        """
        retry_count = 0
        while retry_count < self.settings.SYNC_RETRY_ATTEMPTS:
            try:
                logger.info(f"Syncing data for user {user.id}")
                self.medication_repository.sync_user_medications(user.id)
                self.user_repository.update_last_sync(user.id, datetime.now(timezone.utc))
                logger.info(f"Successfully synced data for user {user.id}")
                return
                
            except Exception as e:
                retry_count += 1
                if retry_count >= self.settings.SYNC_RETRY_ATTEMPTS:
                    logger.error(f"Failed to sync user {user.id} after {retry_count} attempts: {str(e)}")
                    break
                    
                logger.warning(f"Sync attempt {retry_count} failed for user {user.id}: {str(e)}")
                time.sleep(self.settings.SYNC_RETRY_DELAY_SECONDS)

    def run(self) -> None:
        """Run the sync worker continuously."""
        logger.info("Starting SyncWorker")
        while True:
            try:
                self.sync_user_data()
                time.sleep(60)  # Sleep for 1 minute between sync attempts
            except Exception as e:
                logger.error(f"Error in SyncWorker run loop: {str(e)}")
                time.sleep(60)  # Sleep for 1 minute on error before retrying
