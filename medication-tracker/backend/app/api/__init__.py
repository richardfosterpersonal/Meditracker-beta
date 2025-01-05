"""
API Package
Last Updated: 2024-12-25T22:41:17+01:00
Critical Path: API
"""

from fastapi import APIRouter
from .v1 import api_router as v1_router

router = APIRouter()
router.include_router(v1_router)

__all__ = ["v1_router"]
