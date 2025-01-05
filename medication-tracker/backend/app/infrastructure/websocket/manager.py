from typing import Dict, Set
from fastapi import WebSocket
from datetime import datetime
import json
import logging
from app.domain.notification.entities import Notification

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map of user_id to set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"New WebSocket connection for user {user_id}")
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")
        
    async def send_notification(self, user_id: str, notification: Notification):
        if user_id not in self.active_connections:
            return
            
        message = {
            "type": "notification",
            "data": {
                "id": str(notification.id),
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "timestamp": notification.created_at.isoformat(),
                "status": notification.status
            }
        }
        
        dead_connections = set()
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send notification to user {user_id}: {str(e)}")
                dead_connections.add(connection)
                
        # Clean up dead connections
        for dead_connection in dead_connections:
            self.active_connections[user_id].discard(dead_connection)
        
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]
            
    async def broadcast_system_message(self, message: str):
        """Broadcast a system message to all connected clients"""
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    await connection.send_json({
                        "type": "system",
                        "data": {
                            "message": message,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    })
                except Exception as e:
                    logger.error(f"Failed to broadcast system message: {str(e)}")

# Global connection manager instance
manager = ConnectionManager()
