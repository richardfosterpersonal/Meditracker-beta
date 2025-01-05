import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from app.application.services.notification_service import NotificationApplicationService
from app.application.dtos.notification import (
    CreateNotificationDTO,
    NotificationResponseDTO,
    CreateScheduleDTO,
    UpdatePreferencesDTO
)
from app.domain.notification.entities import Notification, NotificationSchedule
from app.domain.user.entities import User, NotificationPreference
from app.application.exceptions import (
    NotFoundException,
    ValidationError,
    UnauthorizedError,
    ExternalServiceError
)

@pytest.fixture
def mock_notification_service():
    return Mock()

@pytest.fixture
def mock_user_repository():
    return Mock()

@pytest.fixture
def mock_carer_repository():
    return Mock()

@pytest.fixture
def mock_email_sender():
    return AsyncMock()

@pytest.fixture
def mock_push_sender():
    return AsyncMock()

@pytest.fixture
def notification_service(
    mock_notification_service,
    mock_user_repository,
    mock_carer_repository,
    mock_email_sender,
    mock_push_sender
):
    return NotificationApplicationService(
        notification_service=mock_notification_service,
        user_repository=mock_user_repository,
        carer_repository=mock_carer_repository,
        email_sender=mock_email_sender,
        push_sender=mock_push_sender
    )

@pytest.fixture
def test_user():
    return User(
        id=1,
        name="Test User",
        email="test@example.com",
        email_verified=True,
        notification_preferences=NotificationPreference(
            email_enabled=True,
            push_enabled=True
        ),
        push_subscription="test-subscription"
    )

@pytest.fixture
def test_notification():
    return Notification(
        id=1,
        type="medication_reminder",
        user_id=1,
        title="Test Notification",
        message="This is a test notification",
        data={},
        urgency="normal",
        action_required=False
    )

@pytest.mark.asyncio
async def test_create_notification_success(
    notification_service,
    mock_notification_service,
    mock_user_repository,
    mock_email_sender,
    mock_push_sender,
    test_user,
    test_notification
):
    # Setup
    dto = CreateNotificationDTO(
        user_id=1,
        type="medication_reminder",
        title="Test Notification",
        message="This is a test notification"
    )
    
    mock_user_repository.get_by_id.return_value = test_user
    mock_notification_service.create_notification.return_value = test_notification
    
    # Execute
    result = await notification_service.create_notification(dto, created_by_id=1)
    
    # Assert
    assert isinstance(result, NotificationResponseDTO)
    assert result.user_id == 1
    assert result.type == "medication_reminder"
    assert mock_email_sender.send_notification.called
    assert mock_push_sender.send_notification.called

@pytest.mark.asyncio
async def test_create_notification_unauthorized(
    notification_service,
    mock_user_repository,
    mock_carer_repository,
    test_user
):
    # Setup
    dto = CreateNotificationDTO(user_id=1)
    mock_user_repository.get_by_id.return_value = test_user
    mock_carer_repository.get_by_user_id.return_value = None
    
    # Execute and Assert
    with pytest.raises(UnauthorizedError):
        await notification_service.create_notification(dto, created_by_id=2)

@pytest.mark.asyncio
async def test_retry_failed_notifications(
    notification_service,
    mock_notification_service,
    mock_user_repository,
    test_user,
    test_notification
):
    # Setup
    test_notification.retry_count = 1
    mock_notification_service.get_failed_notifications.return_value = [test_notification]
    mock_user_repository.get_by_id.return_value = test_user
    
    # Execute
    retry_count = await notification_service.retry_failed_notifications()
    
    # Assert
    assert retry_count == 1
    assert test_notification.retry_count == 1  # Should not increment on success

@pytest.mark.asyncio
async def test_batch_notification_partial_failure(
    notification_service,
    mock_notification_service,
    mock_user_repository,
    test_user,
    test_notification
):
    # Setup
    dtos = [
        CreateNotificationDTO(user_id=1),
        CreateNotificationDTO(user_id=2)  # This one will fail
    ]
    
    mock_user_repository.get_by_id.side_effect = [test_user, None]
    mock_notification_service.create_notification.return_value = test_notification
    
    # Execute
    results = await notification_service.create_batch_notifications(dtos, created_by_id=1)
    
    # Assert
    assert len(results) == 1  # Only one successful notification
    assert isinstance(results[0], NotificationResponseDTO)

def test_get_preferred_channels(notification_service):
    preferences = {"push_enabled": True, "email_enabled": True}
    
    # Test medication reminder
    channels = notification_service._get_preferred_channels("medication_reminder", preferences)
    assert channels == ["push", "email"]
    
    # Test compliance report
    channels = notification_service._get_preferred_channels("compliance_report", preferences)
    assert channels == ["email"]
    
    # Test default with push enabled
    channels = notification_service._get_preferred_channels("other", preferences)
    assert channels == ["push"]
    
    # Test default without push
    preferences["push_enabled"] = False
    channels = notification_service._get_preferred_channels("other", preferences)
    assert channels == ["email"]
