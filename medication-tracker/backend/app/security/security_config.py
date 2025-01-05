"""Security configuration for the medication tracker application."""

from datetime import timedelta
from typing import Dict, Any

# Authentication settings
AUTH_CONFIG = {
    "JWT_SECRET_KEY": None,  # Set from environment variable
    "JWT_ACCESS_TOKEN_EXPIRES": timedelta(hours=1),
    "JWT_REFRESH_TOKEN_EXPIRES": timedelta(days=30),
    "PASSWORD_SALT_LENGTH": 16,
    "MIN_PASSWORD_LENGTH": 12,
    "REQUIRE_SPECIAL_CHARS": True,
    "REQUIRE_NUMBERS": True,
    "REQUIRE_UPPERCASE": True,
    "MAX_LOGIN_ATTEMPTS": 5,
    "LOGIN_COOLDOWN": timedelta(minutes=15),
}

# Rate limiting settings
RATE_LIMIT_CONFIG = {
    "DEFAULT": "100/hour",
    "LOGIN": "5/minute",
    "REGISTER": "3/hour",
    "API": "1000/hour",
    "ENABLED": True,
}

# Session settings
SESSION_CONFIG = {
    "SESSION_TYPE": "redis",
    "SESSION_REDIS_HOST": None,  # Set from environment variable
    "SESSION_REDIS_PORT": None,  # Set from environment variable
    "PERMANENT_SESSION_LIFETIME": timedelta(days=1),
    "SESSION_COOKIE_SECURE": True,
    "SESSION_COOKIE_HTTPONLY": True,
    "SESSION_COOKIE_SAMESITE": "Lax",
}

# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'"
    ),
}

# CORS settings
CORS_CONFIG = {
    "CORS_ALLOW_ORIGINS": [],  # Set from environment variable
    "CORS_ALLOW_METHODS": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "CORS_ALLOW_HEADERS": ["Content-Type", "Authorization"],
    "CORS_MAX_AGE": 600,
}

# API Security
API_SECURITY = {
    "REQUIRE_HTTPS": True,
    "API_KEY_HEADER": "X-API-Key",
    "MAX_CONTENT_LENGTH": 10 * 1024 * 1024,  # 10MB
    "ALLOWED_HOSTS": [],  # Set from environment variable
}

# Audit logging
AUDIT_CONFIG = {
    "ENABLED": True,
    "LOG_LEVEL": "INFO",
    "INCLUDE_HEADERS": ["User-Agent"],
    "EXCLUDE_PATHS": ["/health", "/metrics"],
    "MASK_FIELDS": ["password", "token", "secret"],
}

def load_security_config(env_vars: Dict[str, Any]) -> None:
    """Load security configuration from environment variables."""
    # JWT settings
    AUTH_CONFIG["JWT_SECRET_KEY"] = env_vars.get("JWT_SECRET_KEY")
    
    # Redis session settings
    SESSION_CONFIG["SESSION_REDIS_HOST"] = env_vars.get("REDIS_HOST")
    SESSION_CONFIG["SESSION_REDIS_PORT"] = env_vars.get("REDIS_PORT")
    
    # CORS settings
    CORS_CONFIG["CORS_ALLOW_ORIGINS"] = env_vars.get(
        "CORS_ALLOW_ORIGINS", ""
    ).split(",")
    
    # API settings
    API_SECURITY["ALLOWED_HOSTS"] = env_vars.get("ALLOWED_HOSTS", "").split(",")
    
    # Validate critical settings
    if not AUTH_CONFIG["JWT_SECRET_KEY"]:
        raise ValueError("JWT_SECRET_KEY must be set")
    
    if not SESSION_CONFIG["SESSION_REDIS_HOST"]:
        raise ValueError("REDIS_HOST must be set")
        
    if not API_SECURITY["ALLOWED_HOSTS"]:
        raise ValueError("ALLOWED_HOSTS must be set")
