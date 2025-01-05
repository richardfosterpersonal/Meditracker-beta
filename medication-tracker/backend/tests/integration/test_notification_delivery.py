import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.queue.redis_manager import queue_manager
from app.infrastructure.websocket.manager import manager
from app.domain.notification.entities import Notification
from app.application.dtos.notification import CreateNotificationDTO
from app.application.services.notification_service import NotificationApplicationService

@pytest.fixture
async def test_app():
    # Setup
    await queue_manager.connect()
    yield app
    # Teardown
    await queue_manager.disconnect()

@pytest.fixture
def test_client(test_app):
    return TestClient(test_app)

@pytest.fixture
async def websocket_client(test_app):
    async with test_app.websocket_connect("/api/v1/ws/notifications/1") as websocket:
        yield websocket

@pytest.fixture
def sample_notification():
    return CreateNotificationDTO(
        type="medication_reminder",
        user_id=1,
        title="Integration Test Notification",
        message="Test Message",
        data={"test": "data"},
        urgency="normal",
        action_required=True
    )

async def test_notification_delivery_flow(
    test_app,
    test_client,
    websocket_client,
    sample_notification
):
    """Test the complete notification delivery flow including queue and WebSocket"""
    
    # 1. Create notification through API
    response = test_client.post(
        "/api/v1/notifications",
        json=sample_notification.dict()
    )
    assert response.status_code == 200
    notification_id = response.json()["id"]

    # 2. Verify notification was queued
    queue_stats = await queue_manager.get_queue_stats()
    assert queue_stats["pending_notifications"] > 0

    # 3. Wait for notification processing
    await asyncio.sleep(1)

    # 4. Verify WebSocket received the notification
    message = await websocket_client.receive_json()
    assert message["type"] == "notification"
    assert message["data"]["id"] == str(notification_id)

async def test_scheduled_notification_delivery(
    test_app,
    test_client,
    websocket_client,
    sample_notification
):
    """Test delivery of scheduled notifications"""
    
    # Schedule notification for 2 seconds in the future
    schedule_time = datetime.utcnow() + timedelta(seconds=2)
    sample_notification.schedule_time = schedule_time

    # Create scheduled notification
    response = test_client.post(
        "/api/v1/notifications/schedule",
        json=sample_notification.dict()
    )
    assert response.status_code == 200

    # Verify it's in the scheduled queue
    queue_stats = await queue_manager.get_queue_stats()
    assert queue_stats["scheduled_notifications"] > 0

    # Wait for scheduled time
    await asyncio.sleep(3)

    # Verify notification was delivered
    message = await websocket_client.receive_json()
    assert message["type"] == "notification"
    assert message["data"]["title"] == sample_notification.title

async def test_notification_retry_mechanism(
    test_app,
    test_client,
    monkeypatch,
    sample_notification
):
    """Test notification retry mechanism when delivery fails"""
    
    # Mock email sender to fail
    async def mock_send_email(*args, **kwargs):
        raise Exception("Simulated email failure")

    monkeypatch.setattr(
        "app.infrastructure.notification.email_sender.EmailSender.send_notification",
        mock_send_email
    )

    # Create notification
    response = test_client.post(
        "/api/v1/notifications",
        json=sample_notification.dict()
    )
    assert response.status_code == 200
    notification_id = response.json()["id"]

    # Wait for initial attempt and retry
    await asyncio.sleep(2)

    # Verify notification is in DLQ after retries
    queue_stats = await queue_manager.get_queue_stats()
    assert queue_stats["dead_letter_queue"] > 0

async def test_batch_notification_delivery(
    test_app,
    test_client,
    websocket_client
):
    """Test batch notification delivery"""
    
    # Create multiple notifications
    notifications = [
        sample_notification(),
        sample_notification(),
        sample_notification()
    ]

    # Send batch request
    response = test_client.post(
        "/api/v1/notifications/batch",
        json=[n.dict() for n in notifications]
    )
    assert response.status_code == 200
    assert len(response.json()) == 3

    # Wait for processing
    await asyncio.sleep(1)

    # Verify all notifications were received via WebSocket
    received_count = 0
    for _ in range(3):
        message = await websocket_client.receive_json()
        if message["type"] == "notification":
            received_count += 1
    
    assert received_count == 3

async def test_notification_preferences(
    test_app,
    test_client,
    websocket_client,
    sample_notification
):
    """Test notification delivery respects user preferences"""
    
    # Update user preferences to disable email
    response = test_client.put(
        "/api/v1/users/1/notification-preferences",
        json={
            "email_enabled": False,
            "push_enabled": True
        }
    )
    assert response.status_code == 200

    # Send notification
    response = test_client.post(
        "/api/v1/notifications",
        json=sample_notification.dict()
    )
    assert response.status_code == 200

    # Verify only WebSocket notification was received
    message = await websocket_client.receive_json()
    assert message["type"] == "notification"

    # Verify email was not sent (check logs or mock)
