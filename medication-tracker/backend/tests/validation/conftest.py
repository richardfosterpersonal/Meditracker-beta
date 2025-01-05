"""
Test Configuration for Validation Suite
Last Updated: 2024-12-31T23:16:21+01:00
"""

import pytest
from pathlib import Path
import shutil
import json
from datetime import datetime

@pytest.fixture(scope="session")
def beta_base_path(tmp_path_factory):
    """Create temporary beta testing directory structure"""
    base_path = tmp_path_factory.mktemp("beta")
    
    # Create required directories
    dirs = ["evidence", "feedback", "logs", "db"]
    for dir_name in dirs:
        (base_path / dir_name).mkdir()
        
    return base_path

@pytest.fixture(scope="session")
def evidence_path(beta_base_path):
    """Get evidence directory path"""
    return beta_base_path / "evidence"

@pytest.fixture(scope="session")
def feedback_path(beta_base_path):
    """Get feedback directory path"""
    return beta_base_path / "feedback"

@pytest.fixture(scope="session")
def logs_path(beta_base_path):
    """Get logs directory path"""
    return beta_base_path / "logs"

@pytest.fixture(scope="session")
def db_path(beta_base_path):
    """Get database directory path"""
    return beta_base_path / "db"

@pytest.fixture(scope="function")
def clean_beta_environment(beta_base_path):
    """Clean beta testing environment before each test"""
    # Clear existing files
    for path in beta_base_path.glob("**/*"):
        if path.is_file():
            path.unlink()
            
    # Create empty state file
    state = {
        "current_phase": None,
        "phase_statuses": {},
        "last_updated": datetime.utcnow().isoformat(),
        "validation_chain": []
    }
    
    with open(beta_base_path / "state.json", "w") as f:
        json.dump(state, f)
        
    return beta_base_path

@pytest.fixture(scope="function")
def mock_validation_chain():
    """Create mock validation chain"""
    return {
        "chain_id": f"test-chain-{datetime.utcnow().timestamp()}",
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
        "validations": []
    }

def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers",
        "critical: mark test as part of critical path validation"
    )
    config.addinivalue_line(
        "markers",
        "validation: mark test as validation test"
    )
    config.addinivalue_line(
        "markers",
        "evidence: mark test as evidence collection test"
    )
