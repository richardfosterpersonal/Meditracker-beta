"""
API V1 Router
Last Updated: 2024-12-25T22:50:11+01:00
Critical Path: API.V1

This module implements the core API router for medication safety features.
All routes must comply with CRITICAL_PATH.md and SCOPE_ENFORCEMENT.md.
"""

from fastapi import APIRouter
from .medications import router as medications_router
from .auth import router as auth_router
from .users import router as users_router
from .metrics import router as metrics_router
from .monitoring import router as monitoring_router
from .websocket import router as websocket_router

# Create main API router
api_router = APIRouter()

# Include all routers with proper prefixes and tags
api_router.include_router(
    medications_router,
    prefix="/medications",
    tags=["medications"]
)

api_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    users_router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    metrics_router,
    prefix="/metrics",
    tags=["metrics"]
)

api_router.include_router(
    monitoring_router,
    prefix="/monitoring",
    tags=["monitoring"]
)

api_router.include_router(
    websocket_router,
    prefix="/ws",
    tags=["websocket"]
)

# Export the router
__all__ = ["api_router"]
