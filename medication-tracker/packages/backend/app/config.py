import os
from datetime import timedelta
from pathlib import Path

# Try to load from .env.override first, then fall back to .env
env_path = Path(__file__).parent.parent / '.env.override'
if not env_path.exists():
    env_path = Path(__file__).parent.parent / '.env'

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

class Config:
    # Basic Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-123')
    
    # Database configuration
    base_dir = Path(__file__).parent.parent
    db_path = base_dir / 'data' / 'app.db'
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path.absolute()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-123')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ACCESS_COOKIE_NAME = 'access_token_cookie'
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_COOKIE_SECURE = False  # Set to True in production
    
    # CORS settings
    CORS_HEADERS = 'Content-Type'
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ORIGINS = ['http://localhost:3000']  # Frontend URL
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'Accept']

    # Flask debug configuration
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'

class TestConfig(Config):
    """Test configuration."""
    TESTING = True
    
    # Use in-memory SQLite database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF protection in testing
    WTF_CSRF_ENABLED = False
    
    # Test JWT settings
    JWT_SECRET_KEY = 'test-jwt-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=3600)
    
    # Test email settings
    MAIL_SUPPRESS_SEND = True
    
    # Test rate limiting
    RATELIMIT_ENABLED = False
    
    # Test security headers
    SECURITY_HEADERS = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block'
    }
