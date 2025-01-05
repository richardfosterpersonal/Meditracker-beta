from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

def custom_openapi(app: FastAPI) -> dict:
    """Customize OpenAPI documentation"""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Medication Tracker API",
        version="1.0.0",
        description="""
        The Medication Tracker API provides endpoints for managing medication schedules,
        user accounts, and notifications. It supports both patients and carers, with
        features for medication adherence tracking and carer oversight.
        
        ## Authentication
        All endpoints except `/auth/register` and `/auth/login` require authentication
        using JWT tokens. Include the token in the Authorization header:
        ```
        Authorization: Bearer your-token-here
        ```
        
        ## Rate Limiting
        API endpoints are rate-limited to prevent abuse. The current limits are:
        - Authentication endpoints: 5 requests per minute
        - Other endpoints: 60 requests per minute
        
        ## Error Handling
        The API uses standard HTTP status codes and returns error responses in the format:
        ```json
        {
            "detail": "Error message here"
        }
        ```
        """,
        routes=app.routes,
    )

    # Custom tags metadata
    openapi_schema["tags"] = [
        {
            "name": "auth",
            "description": "Authentication operations including registration, login, and password management",
        },
        {
            "name": "users",
            "description": "User profile management and statistics",
        },
        {
            "name": "medications",
            "description": "Medication schedule management and tracking",
        },
        {
            "name": "notifications",
            "description": "Notification preferences and delivery",
        },
    ]

    # Security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the JWT token in the format: Bearer your-token-here",
        }
    }

    # Apply security globally
    openapi_schema["security"] = [{"Bearer": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema
