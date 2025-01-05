"""
Database Module
Last Updated: 2024-12-25T20:16:10+01:00
Status: BETA
Reference: ../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This module implements critical path database requirements:
1. Data Safety: Connection management and transactions
2. System Stability: Pool handling and recovery
3. Validation Chain: Logging and monitoring
"""

import os
import logging
from datetime import datetime
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
from typing import Generator
from app.core.config import config
from app.core.monitoring import monitor, track_timing, log_error

# Critical Path: Logging Setup
logging.basicConfig(
    filename='../../logs/database.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Define naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# Get database configuration
db_config = config.database_config

# Create SQLAlchemy engine
try:
    engine = create_engine(
        db_config["url"],
        pool_pre_ping=True,
        pool_size=db_config["pool_size"],
        max_overflow=db_config["max_overflow"],
        pool_timeout=db_config["pool_timeout"],
        pool_recycle=db_config["pool_recycle"],
        poolclass=QueuePool
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except SQLAlchemyError as e:
    log_error(e, {"context": "database_initialization"})
    raise

# Create declarative base
Base = declarative_base(metadata=MetaData(naming_convention=convention))

@monitor()
@track_timing("database_session")
def get_db() -> Generator[Session, None, None]:
    """
    Get database session with proper monitoring
    Critical Path: Database.Session
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        log_error(e, {"context": "database_session"})
        raise
    finally:
        db.close()

def init_db() -> None:
    """
    Initialize database with proper validation
    Critical Path: Database.Init
    """
    try:
        # Import all models here to ensure they are registered
        from app.models.medication import Medication  # noqa
        from app.models.user import User  # noqa
        from app.models.notification import Notification  # noqa
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError as e:
        log_error(e, {"context": "database_init"})
        raise

def verify_connection():
    """
    Verify database connection per critical path.
    
    Critical Path Requirements:
    - Connection test
    - Pool validation
    - Recovery check
    """
    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logging.info(f"Database connection verified at {datetime.utcnow()}")
        return True
    except Exception as e:
        logging.error(f"Database connection verification failed: {str(e)}")
        raise

def cleanup():
    """
    Cleanup database resources per critical path.
    
    Critical Path Requirements:
    - Resource cleanup
    - Connection closure
    - Pool shutdown
    """
    try:
        SessionLocal.close_all()
        engine.dispose()
        logging.info(f"Database cleanup completed at {datetime.utcnow()}")
    except Exception as e:
        logging.error(f"Database cleanup failed: {str(e)}")
        raise
