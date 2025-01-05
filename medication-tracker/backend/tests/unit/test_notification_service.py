import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from app.domain.notification.entities import Notification
from app.application.services.notification_service import NotificationApplicationService
from app.application.dtos.notification import (
    CreateNotificationDTO,
    NotificationResponseDTO,
    UpdatePreferencesDTO,
    NotificationChannelDTO
)
from app.application.exceptions import (
    NotFoundException,
    ValidationError,
    UnauthorizedError,
    ExternalServiceError
)
import pytz

@pytest.fixture
def mock_dependencies():
    return {
        "notification_service": Mock(),
        "user_repository": Mock(),
        "carer_repository": Mock(),
        "email_sender": Mock(),
        "push_sender": Mock()
    }

@pytest.fixture
def notification_service(mock_dependencies):
    return NotificationApplicationService(
        notification_service=mock_dependencies["notification_service"],
        user_repository=mock_dependencies["user_repository"],
        carer_repository=mock_dependencies["carer_repository"],
        email_sender=mock_dependencies["email_sender"],
        push_sender=mock_dependencies["push_sender"]
    )

@pytest.fixture
def sample_notification_dto():
    return CreateNotificationDTO(
        type="medication_reminder",
        user_id=1,
        title="Medication Due",
        message="Time to take your medication",
        data={"medication_id": 1, "medication_name": "Test Med"},
        urgency="normal",
        action_required=True,
        action_type="take_medication",
        action_data={"medication_id": 1}
    )

@pytest.fixture
def mock_user():
    return Mock(
        id=1,
        email="test@example.com",
        email_verified=True,
        push_subscription={"endpoint": "test"},
        notification_preferences={
            "email_enabled": True,
            "push_enabled": True
        }
    )

async def test_create_notification_success(notification_service, mock_dependencies, sample_notification_dto, mock_user):
    """Test successful notification creation and delivery"""
    # Setup
    mock_dependencies["user_repository"].get_by_id.return_value = mock_user
    mock_dependencies["notification_service"].create_notification.return_value = Mock(
        id=1,
        **sample_notification_dto.__dict__
    )

    # Execute
    result = await notification_service.create_notification(sample_notification_dto, created_by_id=1)

    # Assert
    assert isinstance(result, NotificationResponseDTO)
    assert result.type == sample_notification_dto.type
    assert result.user_id == sample_notification_dto.user_id
    mock_dependencies["email_sender"].send_notification.assert_called_once()
    mock_dependencies["push_sender"].send_notification.assert_called_once()

async def test_create_notification_unauthorized(notification_service, mock_dependencies, sample_notification_dto):
    """Test unauthorized notification creation"""
    # Setup
    mock_dependencies["user_repository"].get_by_id.return_value = Mock(id=1)
    mock_dependencies["carer_repository"].get_by_user_id.return_value = None

    # Execute and Assert
    with pytest.raises(UnauthorizedError):
        await notification_service.create_notification(sample_notification_dto, created_by_id=2)

async def test_send_notification_retry(notification_service, mock_dependencies, mock_user):
    """Test notification retry mechanism"""
    # Setup
    notification = Mock(
        id=1,
        user_id=1,
        type="medication_reminder",
        retry_count=0,
        max_retries=3
    )
    mock_dependencies["email_sender"].send_notification.side_effect = Exception("Test error")
    mock_dependencies["push_sender"].send_notification.side_effect = Exception("Test error")

    # Execute and Assert
    with pytest.raises(ExternalServiceError):
        await notification_service._send_notification(notification, mock_user)
    
    assert notification.retry_count == 1
    assert notification.error is not None
    mock_dependencies["notification_service"].schedule_retry.assert_called_once()

async def test_notification_priority_handling(notification_service, mock_dependencies, mock_user):
    """Test notification priority affects delivery strategy"""
    # Setup
    urgent_notification = CreateNotificationDTO(
        type="missed_medication",
        user_id=1,
        title="Missed Critical Medication",
        message="Important medication missed",
        urgency="urgent",
        action_required=True
    )
    
    mock_dependencies["user_repository"].get_by_id.return_value = mock_user
    mock_dependencies["notification_service"].create_notification.return_value = Mock(
        id=1,
        **urgent_notification.__dict__
    )

    # Execute
    result = await notification_service.create_notification(urgent_notification, created_by_id=1)

    # Assert
    assert result.urgency == "urgent"
    mock_dependencies["email_sender"].send_urgent_notification.assert_called_once()
    mock_dependencies["push_sender"].send_urgent_notification.assert_called_once()

async def test_timezone_aware_notifications(notification_service, mock_dependencies):
    """Test notifications respect user timezone"""
    # Setup
    user_timezone = "America/New_York"
    mock_user_tz = Mock(
        id=1,
        timezone=user_timezone,
        email="test@example.com",
        notification_preferences={"email_enabled": True}
    )
    mock_dependencies["user_repository"].get_by_id.return_value = mock_user_tz
    
    scheduled_time = datetime.now(pytz.timezone(user_timezone))
    notification = CreateNotificationDTO(
        type="medication_reminder",
        user_id=1,
        schedule_time=scheduled_time,
        title="Scheduled Reminder",
        message="Take medication"
    )

    # Execute
    result = await notification_service.create_notification(notification, created_by_id=1)

    # Assert
    assert result.schedule_time.tzinfo is not None
    assert result.schedule_time.tzname() == user_timezone

async def test_carer_notification_cascade(notification_service, mock_dependencies, mock_user):
    """Test notification cascade to carers"""
    # Setup
    mock_carer = Mock(id=2, email="carer@example.com")
    mock_dependencies["carer_repository"].get_carers_for_user.return_value = [mock_carer]
    
    urgent_notification = CreateNotificationDTO(
        type="emergency_alert",
        user_id=1,
        title="Emergency Alert",
        message="Patient needs immediate attention",
        urgency="urgent"
    )

    # Execute
    result = await notification_service.create_notification(urgent_notification, created_by_id=1)

    # Assert
    assert mock_dependencies["email_sender"].send_notification.call_count == 2  # User + Carer
    carer_call = mock_dependencies["email_sender"].send_notification.call_args_list[1]
    assert carer_call[0][0].recipient_email == "carer@example.com"

async def test_notification_channel_fallback(notification_service, mock_dependencies, mock_user):
    """Test notification channel fallback mechanism"""
    # Setup
    notification = CreateNotificationDTO(
        type="medication_reminder",
        user_id=1,
        title="Test Reminder",
        message="Test message"
    )
    mock_dependencies["push_sender"].send_notification.side_effect = Exception("Push failed")
    mock_dependencies["email_sender"].send_notification.return_value = True

    # Execute
    result = await notification_service.create_notification(notification, created_by_id=1)

    # Assert
    assert result is not None
    mock_dependencies["push_sender"].send_notification.assert_called_once()
    mock_dependencies["email_sender"].send_notification.assert_called_once()

async def test_notification_batching(notification_service, mock_dependencies):
    """Test batch notification processing"""
    # Setup
    notifications = [
        CreateNotificationDTO(
            type="medication_reminder",
            user_id=1,
            title=f"Reminder {i}",
            message=f"Message {i}"
        ) for i in range(3)
    ]
    
    mock_dependencies["notification_service"].create_batch_notifications.return_value = [
        Mock(id=i) for i in range(3)
    ]

    # Execute
    results = await notification_service.create_batch_notifications(notifications, created_by_id=1)

    # Assert
    assert len(results) == 3
    assert mock_dependencies["notification_service"].create_batch_notifications.called_once_with(notifications)

def test_get_preferred_channels(notification_service):
    """Test notification channel preference handling"""
    # Test medication reminder
    channels = notification_service._get_preferred_channels(
        "medication_reminder",
        {"push_enabled": True, "email_enabled": True}
    )
    assert channels == ["push", "email"]

    # Test refill alert
    channels = notification_service._get_preferred_channels(
        "refill_alert",
        {"push_enabled": True, "email_enabled": True}
    )
    assert channels == ["email", "push"]

    # Test compliance report
    channels = notification_service._get_preferred_channels(
        "compliance_report",
        {"push_enabled": True, "email_enabled": True}
    )
    assert channels == ["email"]

async def test_error_handling_and_logging(notification_service, mock_dependencies, caplog):
    """Test error handling and logging"""
    # Setup
    notification = CreateNotificationDTO(
        type="medication_reminder",
        user_id=1,
        title="Test",
        message="Test"
    )
    mock_dependencies["email_sender"].send_notification.side_effect = Exception("Test error")
    mock_dependencies["push_sender"].send_notification.side_effect = Exception("Test error")

    # Execute
    with pytest.raises(ExternalServiceError):
        await notification_service.create_notification(notification, created_by_id=1)

    # Assert
    assert "Failed to send notification" in caplog.text
    assert "Test error" in caplog.text

async def test_process_due_notifications(notification_service, mock_dependencies):
    # Setup
    mock_dependencies["notification_service"].get_due_notifications.return_value = [
        Mock(id=1, user_id=1),
        Mock(id=2, user_id=2)
    ]

    # Execute
    await notification_service.process_due_notifications()

    # Assert
    mock_dependencies["notification_service"].process_due_notifications.assert_called_once()

def test_get_notification_channels(notification_service, mock_dependencies, mock_user):
    # Setup
    mock_dependencies["user_repository"].get_by_id.return_value = mock_user

    # Execute
    result = notification_service.get_notification_channels(user_id=1)

    # Assert
    assert len(result) == 2  # email and push channels
    assert all(isinstance(channel, NotificationChannelDTO) for channel in result)
    email_channel = next(c for c in result if c.channel_type == "email")
    push_channel = next(c for c in result if c.channel_type == "push")
    assert email_channel.enabled == True
    assert push_channel.enabled == True
    assert email_channel.verified == True
    assert push_channel.verified == True

async def test_batch_notifications(notification_service, mock_dependencies, sample_notification_dto):
    # Setup
    mock_dependencies["user_repository"].get_by_id.return_value = mock_user
    mock_dependencies["notification_service"].create_notification.return_value = Mock(
        id=1,
        **sample_notification_dto.__dict__
    )

    # Execute
    result = await notification_service.create_batch_notifications(
        [sample_notification_dto, sample_notification_dto],
        created_by_id=1
    )

    # Assert
    assert len(result) == 2
    assert all(isinstance(r, NotificationResponseDTO) for r in result)
