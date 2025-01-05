from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
from typing import Dict, Any, Optional
from pydantic import ValidationError, BaseModel
import logging

logger = logging.getLogger(__name__)

class RequestValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=422, detail=detail)

class ValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            # Validate request headers
            await self.validate_headers(request)
            
            # Validate request body for POST/PUT/PATCH requests
            if request.method in ["POST", "PUT", "PATCH"]:
                await self.validate_request_body(request)
            
            # Validate query parameters
            await self.validate_query_params(request)
            
            # Proceed with the request if validation passes
            response = await call_next(request)
            return response
            
        except RequestValidationError as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )
        except Exception as exc:
            logger.error(f"Validation error: {str(exc)}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error during validation"}
            )

    async def validate_headers(self, request: Request):
        """Validate required headers and their format."""
        # Check Content-Type for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "").lower()
            if not content_type.startswith("application/json"):
                raise RequestValidationError(
                    "Content-Type must be application/json for POST/PUT/PATCH requests"
                )

        # Check Authorization header format if present
        auth_header = request.headers.get("authorization")
        if auth_header:
            if not auth_header.startswith("Bearer "):
                raise RequestValidationError(
                    "Invalid Authorization header format. Must start with 'Bearer '"
                )

    async def validate_request_body(self, request: Request):
        """Validate request body content."""
        try:
            body = await request.body()
            if not body:
                return
                
            try:
                json_body = json.loads(body)
            except json.JSONDecodeError:
                raise RequestValidationError("Invalid JSON in request body")

            # Size validation
            if len(body) > 1_000_000:  # 1MB limit
                raise RequestValidationError("Request body too large")

            # Content validation based on endpoint
            path = request.url.path
            if path.startswith("/api/medications"):
                await self.validate_medication_payload(json_body)
            elif path.startswith("/api/users"):
                await self.validate_user_payload(json_body)

        except UnicodeDecodeError:
            raise RequestValidationError("Invalid request body encoding")

    async def validate_query_params(self, request: Request):
        """Validate query parameters."""
        params = dict(request.query_params)
        
        # Validate pagination parameters
        if "page" in params:
            try:
                page = int(params["page"])
                if page < 1:
                    raise RequestValidationError("Page number must be positive")
            except ValueError:
                raise RequestValidationError("Invalid page number")

        if "limit" in params:
            try:
                limit = int(params["limit"])
                if limit < 1 or limit > 100:
                    raise RequestValidationError("Limit must be between 1 and 100")
            except ValueError:
                raise RequestValidationError("Invalid limit value")

        # Validate specific endpoint parameters
        path = request.url.path
        if path.startswith("/api/medications"):
            await self.validate_medication_params(params)

    async def validate_medication_payload(self, data: Dict[str, Any]):
        """Validate medication-specific payload."""
        required_fields = ["name", "dosage", "schedule"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise RequestValidationError(f"Missing required fields: {', '.join(missing_fields)}")

        if "dosage" in data:
            dosage = data["dosage"]
            if not isinstance(dosage, dict):
                raise RequestValidationError("Dosage must be an object")
            if "amount" not in dosage or "unit" not in dosage:
                raise RequestValidationError("Dosage must contain amount and unit")

    async def validate_medication_params(self, params: Dict[str, str]):
        """Validate medication-specific query parameters."""
        if "status" in params:
            valid_statuses = ["active", "inactive", "completed", "discontinued"]
            if params["status"] not in valid_statuses:
                raise RequestValidationError(
                    f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                )

    async def validate_user_payload(self, data: Dict[str, Any]):
        """Validate user-specific payload."""
        if "email" in data:
            email = data["email"]
            if not isinstance(email, str) or "@" not in email:
                raise RequestValidationError("Invalid email format")

        if "password" in data:
            password = data["password"]
            if not isinstance(password, str) or len(password) < 8:
                raise RequestValidationError("Password must be at least 8 characters long")
