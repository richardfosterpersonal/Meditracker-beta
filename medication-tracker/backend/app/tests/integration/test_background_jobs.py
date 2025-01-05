"""
Background Jobs Integration Tests
Maintains critical path alignment and validation chain
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import Mock, patch

from app.core.background_jobs_orchestrator import (
    BackgroundJobsOrchestrator,
    JobPriority,
    JobType,
    JobConfig,
    JobMetrics
)
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

@pytest.fixture
async def background_jobs():
    """Create background jobs orchestrator for testing"""
    return BackgroundJobsOrchestrator()

@pytest.fixture
def mock_metrics_service():
    """Create mock metrics service"""
    return Mock(spec=MetricsService)

@pytest.mark.asyncio
async def test_medication_reminder_job(background_jobs: BackgroundJobsOrchestrator):
    """Test medication reminder job execution"""
    # Test data
    job_id = "test_med_reminder_001"
    input_data = {
        "user_id": "user_123",
        "medication_id": "med_456",
        "schedule": {
            "frequency": "daily",
            "times": ["09:00", "21:00"]
        }
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.MEDICATION_REMINDER,
        config={
            "schedule": {"type": "cron", "value": "*/15 * * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "medication_reminder" in evidence
    assert evidence["medication_reminder"]["job_id"] == job_id
    assert evidence["medication_reminder"]["user_id"] == input_data["user_id"]
    assert evidence["medication_reminder"]["medication_id"] == input_data["medication_id"]

@pytest.mark.asyncio
async def test_refill_check_job(background_jobs: BackgroundJobsOrchestrator):
    """Test refill check job execution"""
    # Test data
    job_id = "test_refill_001"
    input_data = {
        "user_id": "user_123",
        "medication_id": "med_456",
        "current_supply": 5
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.REFILL_CHECK,
        config={
            "schedule": {"type": "cron", "value": "0 */4 * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "refill_check" in evidence
    assert evidence["refill_check"]["job_id"] == job_id
    assert evidence["refill_check"]["user_id"] == input_data["user_id"]
    assert evidence["refill_check"]["medication_id"] == input_data["medication_id"]
    assert evidence["refill_check"]["current_supply"] == input_data["current_supply"]

@pytest.mark.asyncio
async def test_interaction_check_job(background_jobs: BackgroundJobsOrchestrator):
    """Test interaction check job execution"""
    # Test data
    job_id = "test_interaction_001"
    input_data = {
        "user_id": "user_123",
        "medications": ["med_456", "med_789"]
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.CRITICAL,
        job_type=JobType.INTERACTION_CHECK,
        config={
            "schedule": {"type": "cron", "value": "*/30 * * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "interaction_check" in evidence
    assert evidence["interaction_check"]["job_id"] == job_id
    assert evidence["interaction_check"]["user_id"] == input_data["user_id"]
    assert evidence["interaction_check"]["medications"] == input_data["medications"]

@pytest.mark.asyncio
async def test_supply_monitor_job(background_jobs: BackgroundJobsOrchestrator):
    """Test supply monitor job execution"""
    # Test data
    job_id = "test_supply_001"
    input_data = {
        "user_id": "user_123",
        "medications": ["med_456", "med_789"]
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.SUPPLY_MONITOR,
        config={
            "schedule": {"type": "cron", "value": "0 */6 * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "supply_monitor" in evidence
    assert evidence["supply_monitor"]["job_id"] == job_id
    assert evidence["supply_monitor"]["user_id"] == input_data["user_id"]
    assert evidence["supply_monitor"]["medications"] == input_data["medications"]

@pytest.mark.asyncio
async def test_analytics_roll_up_job(background_jobs: BackgroundJobsOrchestrator):
    """Test analytics roll up job execution"""
    # Test data
    job_id = "test_analytics_001"
    input_data = {
        "time_range": {
            "start": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "end": datetime.utcnow().isoformat()
        },
        "metrics_types": ["adherence", "supply", "safety", "performance"]
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.MEDIUM,
        job_type=JobType.ANALYTICS_ROLL_UP,
        config={
            "schedule": {"type": "cron", "value": "0 0 * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 600,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "analytics_roll_up" in evidence
    assert evidence["analytics_roll_up"]["job_id"] == job_id
    assert evidence["analytics_roll_up"]["time_range"] == input_data["time_range"]
    assert evidence["analytics_roll_up"]["metrics_types"] == input_data["metrics_types"]

@pytest.mark.asyncio
async def test_backup_job(background_jobs: BackgroundJobsOrchestrator):
    """Test backup job execution"""
    # Test data
    job_id = "test_backup_001"
    input_data = {
        "backup_type": "full",
        "storage_config": {
            "type": "local",
            "path": "/tmp/backups"
        }
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.BACKUP,
        config={
            "schedule": {"type": "cron", "value": "0 1 * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 1800,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job
    result = await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Validate results
    assert result.is_valid
    assert "backup" in evidence
    assert evidence["backup"]["job_id"] == job_id
    assert evidence["backup"]["backup_type"] == input_data["backup_type"]
    assert "backup_id" in evidence["backup"]
    assert "validation_result" in evidence["backup"]

@pytest.mark.asyncio
async def test_error_handling(background_jobs: BackgroundJobsOrchestrator):
    """Test error handling in job execution"""
    # Test data
    job_id = "test_error_001"
    input_data = {
        "user_id": "user_123",
        "medication_id": "med_456"
        # Missing required 'schedule' field
    }
    evidence: Dict[str, Any] = {}

    # Register job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.MEDICATION_REMINDER,
        config={
            "schedule": {"type": "cron", "value": "*/15 * * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    # Execute job and expect error
    with pytest.raises(ValueError) as exc_info:
        await background_jobs.execute_job(
            job_id=job_id,
            input_data=input_data,
            evidence=evidence
        )

    assert "Missing required input data" in str(exc_info.value)

@pytest.mark.asyncio
async def test_metrics_collection(
    background_jobs: BackgroundJobsOrchestrator,
    mock_metrics_service: Mock
):
    """Test metrics collection during job execution"""
    # Replace metrics service with mock
    background_jobs.metrics_service = mock_metrics_service

    # Test data
    job_id = "test_metrics_001"
    input_data = {
        "user_id": "user_123",
        "medication_id": "med_456",
        "schedule": {
            "frequency": "daily",
            "times": ["09:00", "21:00"]
        }
    }
    evidence: Dict[str, Any] = {}

    # Execute job
    await background_jobs.register_job(
        job_id=job_id,
        priority=JobPriority.HIGH,
        job_type=JobType.MEDICATION_REMINDER,
        config={
            "schedule": {"type": "cron", "value": "*/15 * * * *"},
            "retry_policy": {"max_attempts": 3, "delay": 300},
            "timeout": 300,
            "validation_rules": {"critical_path": True},
            "monitoring_config": {"metrics_enabled": True}
        },
        evidence=evidence
    )

    await background_jobs.execute_job(
        job_id=job_id,
        input_data=input_data,
        evidence=evidence
    )

    # Verify metrics were collected
    mock_metrics_service.track_job_execution.assert_called_with(
        job_id=job_id,
        job_type=JobType.MEDICATION_REMINDER,
        execution_time=mock_metrics_service.track_job_execution.call_args[1]["execution_time"],
        status="success"
    )
