"""
Test Configuration
Critical Path: TEST-CONFIG
Last Updated: 2025-01-02T16:08:17+01:00
"""

import os
import sys
import pytest
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi.testclient import TestClient

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.core.config import config
from app.database import Base, get_db
from app.main import app
from app.core.monitoring import log_error
from app.models.user import User
from app.models.medication import Medication
from app.schemas.medication import MedicationCreate

# Test database URL (using SQLite for testing)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except SQLAlchemyError as e:
    log_error(e, {"context": "test_database_initialization"})
    raise

@pytest.fixture(scope="session")
def test_config():
    """Test configuration fixture"""
    return config

@pytest.fixture(scope="session")
def test_data_dir(test_config) -> Generator[Path, None, None]:
    """Test data directory fixture"""
    data_dir = test_config.get_path("data")
    data_dir.mkdir(parents=True, exist_ok=True)
    yield data_dir

@pytest.fixture(scope="session")
def validation_evidence_dir(test_config) -> Generator[Path, None, None]:
    """Validation evidence directory fixture"""
    evidence_dir = test_config.get_path("validation_evidence")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    yield evidence_dir

@pytest.fixture(scope="session")
def beta_evidence_dir(test_config) -> Generator[Path, None, None]:
    """Beta evidence directory fixture"""
    evidence_dir = test_config.get_path("beta_evidence")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    yield evidence_dir

@pytest.fixture(scope="session")
def test_app():
    """Test app fixture for critical path testing"""
    return app

@pytest.fixture(scope="session", autouse=True)
def test_db():
    """Test database fixture"""
    try:
        Base.metadata.create_all(bind=engine)
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()  # Close all connections
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
            except PermissionError:
                pass  # Ignore permission errors on cleanup

@pytest.fixture
def test_session(test_db) -> Generator[Session, None, None]:
    """Test database session"""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def test_client(test_app, test_session):
    """Test client fixture"""
    def override_get_db():
        try:
            yield test_session
        finally:
            test_session.close()
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(test_app) as client:
        yield client
    app.dependency_overrides = {}

@pytest.fixture
def test_user(test_session):
    """Test user fixture"""
    user = User(
        email="test@example.com",
        hashed_password="test_password_hash",
        full_name="Test User"
    )
    test_session.add(user)
    test_session.commit()
    test_session.refresh(user)
    return user

@pytest.fixture
def test_medication(test_session, test_user):
    """Test medication fixture"""
    medication = MedicationCreate(
        name="Test Medication",
        dosage="10mg",
        frequency="daily",
        user_id=test_user.id,
        dosage_unit="mg",
        dosage_value=10.0
    )
    db_medication = Medication(**medication.model_dump())
    test_session.add(db_medication)
    test_session.commit()
    test_session.refresh(db_medication)
    return db_medication
