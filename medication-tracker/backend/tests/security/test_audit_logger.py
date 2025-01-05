"""Tests for the audit logging system."""

import pytest
import json
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, mock_open, MagicMock

from app.security.audit_logger import AuditLogger, audit_log
from app.core.config import get_settings

@pytest.fixture
def mock_log_file():
    """Create a mock log file."""
    mock_file = MagicMock()
    mock_file.write = MagicMock()
    mock_file_context = MagicMock()
    mock_file_context.__enter__ = MagicMock(return_value=mock_file)
    mock_file_context.__exit__ = MagicMock(return_value=None)
    
    with patch("builtins.open", return_value=mock_file_context), \
         patch("pathlib.Path.mkdir"), \
         patch("pathlib.Path.exists", return_value=True):
        yield mock_file

@pytest.fixture
def audit_logger(mock_log_file):
    """Create an audit logger instance."""
    with patch("pathlib.Path.mkdir"), \
         patch("pathlib.Path.exists", return_value=True):
        return AuditLogger("test_module")

def test_audit_logger_initialization(mock_log_file):
    """Test audit logger initialization."""
    with patch("pathlib.Path.mkdir"), \
         patch("pathlib.Path.exists", return_value=True):
        logger = AuditLogger("test_module")
        assert logger.logger.name == "audit.test_module"
        assert logger.logger.level == logging.INFO

def test_audit_log_format(audit_logger, mock_log_file):
    """Test audit log entry format."""
    test_data = {"action": "test_action", "status": "success"}
    
    # Log an event
    audit_logger.info("test_event", test_data, user_id=123)
    
    # Get the logged message
    mock_file = mock_log_file
    write_calls = mock_file.write.call_args_list
    assert len(write_calls) > 0
    
    log_call = write_calls[0][0][0]
    log_entry = json.loads(log_call.split(" - ")[-1])
    
    # Verify log structure
    assert "timestamp" in log_entry
    assert "event_type" in log_entry
    assert "user_id" in log_entry
    assert "data" in log_entry
    assert "hash" in log_entry
    
    # Verify data
    assert log_entry["event_type"] == "test_event"
    assert log_entry["user_id"] == 123
    assert log_entry["data"] == test_data

def test_audit_log_integrity(audit_logger):
    """Test audit log integrity verification."""
    test_data = {"action": "test_action"}
    
    # Create a log entry
    log_entry = audit_logger._format_log_entry("test_event", test_data)
    log_dict = json.loads(log_entry)
    
    # Verify hash
    original_hash = log_dict.pop("hash")
    verification_hash = audit_logger._generate_entry_hash(log_dict)
    
    assert original_hash == verification_hash

def test_audit_log_levels(audit_logger, mock_log_file):
    """Test different audit log levels."""
    test_data = {"action": "test_action"}
    
    # Test info level
    audit_logger.info("info_event", test_data)
    assert "INFO" in mock_log_file.write.call_args_list[0][0][0]
    
    # Test warning level
    audit_logger.warning("warning_event", test_data)
    assert "WARNING" in mock_log_file.write.call_args_list[1][0][0]
    
    # Test error level
    audit_logger.error("error_event", test_data)
    assert "ERROR" in mock_log_file.write.call_args_list[2][0][0]

def test_audit_log_security_event(audit_logger, mock_log_file):
    """Test security-specific event logging."""
    test_data = {"action": "login_attempt"}
    
    # Log security event
    audit_logger.security_event("auth_failure", test_data, user_id=123)
    
    # Verify log entry
    log_call = mock_log_file.write.call_args[0][0]
    log_entry = json.loads(log_call.split(" - ")[-1])
    
    assert log_entry["event_type"] == "security_auth_failure"
    assert log_entry["data"]["security_level"] == "high"

@audit_log("test_operation")
def sample_function(arg1, arg2):
    """Sample function for testing audit log decorator."""
    return arg1 + arg2

def test_audit_log_decorator(mock_log_file):
    """Test audit log decorator."""
    # Call decorated function
    result = sample_function(1, 2)
    
    # Verify function execution
    assert result == 3
    
    # Verify log entries
    log_calls = mock_log_file.write.call_args_list
    
    # Check start log
    start_log = json.loads(log_calls[0][0][0].split(" - ")[-1])
    assert start_log["event_type"] == "test_operation_start"
    assert "sample_function" in start_log["data"]["function"]
    
    # Check complete log
    complete_log = json.loads(log_calls[1][0][0].split(" - ")[-1])
    assert complete_log["event_type"] == "test_operation_complete"
    assert complete_log["data"]["status"] == "success"

def test_audit_log_decorator_error(mock_log_file):
    """Test audit log decorator with error."""
    @audit_log("error_operation")
    def error_function():
        raise ValueError("Test error")

    # Call function that raises error
    with pytest.raises(ValueError):
        error_function()
    
    # Verify error log
    log_calls = mock_log_file.write.call_args_list
    error_log = json.loads(log_calls[1][0][0].split(" - ")[-1])
    
    assert error_log["event_type"] == "error_operation_error"
    assert "Test error" in error_log["data"]["error"]

def test_audit_logger_file_handling(tmp_path):
    """Test audit logger file handling."""
    # Create temporary log file
    log_path = tmp_path / "audit.log"
    
    with patch("app.core.config.get_settings") as mock_settings:
        mock_settings.return_value.AUDIT_LOG_PATH = str(log_path)
        
        # Create logger
        with patch("pathlib.Path.mkdir"), \
             patch("pathlib.Path.exists", return_value=True):
            logger = AuditLogger("test_module")
        
        # Log some events
        logger.info("test_event", {"action": "test"})
        
        # Verify file was created and contains logs
        assert log_path.exists()
        log_content = log_path.read_text()
        assert "test_event" in log_content

def test_audit_log_concurrent_writing(tmp_path):
    """Test concurrent writing to audit log."""
    import threading
    
    # Create temporary log file
    log_path = tmp_path / "audit.log"
    
    with patch("app.core.config.get_settings") as mock_settings:
        mock_settings.return_value.AUDIT_LOG_PATH = str(log_path)
        with patch("pathlib.Path.mkdir"), \
             patch("pathlib.Path.exists", return_value=True):
            logger = AuditLogger("test_module")
        
        # Create multiple threads to write logs
        threads = []
        for i in range(10):
            thread = threading.Thread(
                target=logger.info,
                args=(f"thread_{i}", {"thread_id": i})
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all logs were written
        log_content = log_path.read_text()
        for i in range(10):
            assert f"thread_{i}" in log_content

def test_audit_log_large_data(audit_logger, mock_log_file):
    """Test logging large data structures."""
    # Create large nested data structure
    large_data = {
        "level1": {
            "level2": {
                "level3": [1] * 1000  # Large list
            }
        }
    }
    
    # Log large data
    audit_logger.info("large_data_event", large_data)
    
    # Verify log was written successfully
    log_call = mock_log_file.write.call_args[0][0]
    log_entry = json.loads(log_call.split(" - ")[-1])
    
    assert log_entry["event_type"] == "large_data_event"
    assert log_entry["data"] == large_data
