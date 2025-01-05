"""
Validation Middleware
Critical Path: VALIDATION-MIDDLEWARE
Last Updated: 2025-01-02T20:01:23+01:00
"""

import logging
from functools import wraps
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone

from flask import request, jsonify

from ..exceptions import ValidationError
from ..models.validation_result import ValidationResult
from ..core.validation_service import validation_service

logger = logging.getLogger(__name__)

def validate_request(func: Callable) -> Callable:
    """Validate incoming request"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            # Get request data
            data = request.get_json() if request.is_json else {}
            
            # Create validation context
            context = {
                "endpoint": request.endpoint,
                "method": request.method,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "headers": dict(request.headers),
                "query_params": dict(request.args),
                "path": request.path,
                "remote_addr": request.remote_addr
            }
            
            # Validate request using unified framework
            result = await validation_service.validate_request(context)
            if not result.get("valid", False):
                return jsonify({
                    "error": "Validation failed",
                    "details": result.get("evidence", {}),
                    "issues": result.get("issues", []),
                    "warnings": result.get("warnings", [])
                }), 400
                
            return await func(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Request validation failed: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 500
            
    return wrapper
    
def register_validation_middleware(app):
    """Register validation middleware with Flask app"""
    @app.before_request
    async def validate_all_requests():
        """Validate all incoming requests"""
        try:
            # Skip validation for certain endpoints
            if request.endpoint in {'static', 'health', 'swagger_ui', 'openapi'}:
                return None
                
            # Create validation context
            context = {
                "endpoint": request.endpoint,
                "method": request.method,
                "data": request.get_json() if request.is_json else {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "headers": dict(request.headers),
                "query_params": dict(request.args),
                "path": request.path,
                "remote_addr": request.remote_addr
            }
            
            # Validate request using unified framework
            result = await validation_service.validate_request(context)
            if not result.get("valid", False):
                return jsonify({
                    "error": "Validation failed",
                    "details": result.get("evidence", {}),
                    "issues": result.get("issues", []),
                    "warnings": result.get("warnings", [])
                }), 400
                
        except Exception as e:
            logger.error(f"Request validation failed: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 500
