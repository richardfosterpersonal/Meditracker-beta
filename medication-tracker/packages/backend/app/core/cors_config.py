from flask_cors import CORS
from flask import Flask

def init_cors(app: Flask) -> None:
    """Initialize CORS for the application with secure defaults"""
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",  # Development
                    "https://medication-tracker.example.com"  # Production
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "X-Requested-With"
                ],
                "expose_headers": [
                    "Content-Range",
                    "X-Total-Count"
                ],
                "supports_credentials": True,
                "max_age": 600  # Cache preflight requests for 10 minutes
            }
        }
    )
