from fastapi import APIRouter, WebSocket, Depends, HTTPException
from app.infrastructure.websocket.manager import manager
from app.api.dependencies.auth import get_current_user
from app.domain.user.entities import User
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    # Verify that the requesting user matches the user_id or is a carer for that user
    if str(current_user.id) != user_id and not any(c.user_id == user_id for c in current_user.carer_for):
        await websocket.close(code=4003)  # Custom close code for unauthorized
        return
        
    try:
        await manager.connect(websocket, user_id)
        
        # Send initial connection success message
        await websocket.send_json({
            "type": "system",
            "data": {
                "message": "Connected successfully",
                "userId": user_id
            }
        })
        
        while True:
            # Keep the connection alive and handle incoming messages
            data = await websocket.receive_text()
            # For now, we just echo back the received message
            await websocket.send_json({
                "type": "echo",
                "data": data
            })
            
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
    finally:
        manager.disconnect(websocket, user_id)
