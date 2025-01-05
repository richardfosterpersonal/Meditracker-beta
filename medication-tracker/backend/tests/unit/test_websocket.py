import pytest
from unittest.mock import Mock, patch
from fastapi import WebSocket
from app.infrastructure.websocket.manager import ConnectionManager
from app.domain.notification.entities import Notification
from datetime import datetime

@pytest.fixture
def connection_manager():
    return ConnectionManager()

@pytest.fixture
def mock_websocket():
    websocket = Mock(spec=WebSocket)
    websocket.send_json = Mock()
    return websocket

@pytest.fixture
def sample_notification():
    return Notification(
        type="medication_reminder",
        user_id=1,
        title="Test Notification",
        message="Test Message",
        data={"test": "data"},
        created_at=datetime.utcnow()
    )

async def test_connect(connection_manager, mock_websocket):
    # Execute
    await connection_manager.connect(mock_websocket, "user1")

    # Assert
    assert "user1" in connection_manager.active_connections
    assert mock_websocket in connection_manager.active_connections["user1"]
    mock_websocket.accept.assert_called_once()

def test_disconnect(connection_manager, mock_websocket):
    # Setup
    connection_manager.active_connections["user1"] = {mock_websocket}

    # Execute
    connection_manager.disconnect(mock_websocket, "user1")

    # Assert
    assert "user1" not in connection_manager.active_connections

async def test_send_notification(connection_manager, mock_websocket, sample_notification):
    # Setup
    connection_manager.active_connections["1"] = {mock_websocket}

    # Execute
    await connection_manager.send_notification("1", sample_notification)

    # Assert
    mock_websocket.send_json.assert_called_once()
    sent_message = mock_websocket.send_json.call_args[0][0]
    assert sent_message["type"] == "notification"
    assert sent_message["data"]["id"] == str(sample_notification.id)
    assert sent_message["data"]["title"] == sample_notification.title

async def test_send_notification_no_connections(connection_manager, sample_notification):
    # Execute
    await connection_manager.send_notification("1", sample_notification)
    # Should not raise any exceptions

async def test_send_notification_failed_connection(connection_manager, mock_websocket, sample_notification):
    # Setup
    mock_websocket.send_json.side_effect = Exception("Connection error")
    connection_manager.active_connections["1"] = {mock_websocket}

    # Execute
    await connection_manager.send_notification("1", sample_notification)

    # Assert
    assert "1" not in connection_manager.active_connections

async def test_broadcast_system_message(connection_manager, mock_websocket):
    # Setup
    connection_manager.active_connections["user1"] = {mock_websocket}
    connection_manager.active_connections["user2"] = {mock_websocket}

    # Execute
    await connection_manager.broadcast_system_message("Test system message")

    # Assert
    assert mock_websocket.send_json.call_count == 2
    sent_message = mock_websocket.send_json.call_args[0][0]
    assert sent_message["type"] == "system"
    assert sent_message["data"]["message"] == "Test system message"

async def test_multiple_connections_same_user(connection_manager, mock_websocket):
    # Setup
    another_websocket = Mock(spec=WebSocket)
    another_websocket.send_json = Mock()

    # Execute
    await connection_manager.connect(mock_websocket, "user1")
    await connection_manager.connect(another_websocket, "user1")

    # Assert
    assert len(connection_manager.active_connections["user1"]) == 2

    # Test sending notification
    notification = sample_notification()
    await connection_manager.send_notification("1", notification)
    assert mock_websocket.send_json.called
    assert another_websocket.send_json.called
