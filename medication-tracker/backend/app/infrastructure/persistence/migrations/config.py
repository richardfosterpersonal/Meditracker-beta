import os
from typing import Optional
from urllib.parse import urlparse

def get_database_config() -> dict:
    """Get database configuration from environment variables"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    
    # Parse the URL
    parsed = urlparse(database_url)
    
    # Handle SQLite specially
    if parsed.scheme == 'sqlite':
        return {
            'driver': 'sqlite',
            'database': parsed.path.lstrip('/'),
            'host': None,
            'port': None,
            'username': None,
            'password': None
        }
    
    # Handle PostgreSQL URL format from Heroku
    if parsed.scheme == 'postgres':
        return {
            'driver': 'postgresql',
            'database': parsed.path.lstrip('/'),
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'username': parsed.username,
            'password': parsed.password
        }
    
    # Handle explicit PostgreSQL configuration
    return {
        'driver': os.getenv('DB_DRIVER', 'postgresql'),
        'database': os.getenv('DB_NAME', 'medication_tracker'),
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'username': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', '')
    }

def get_database_url() -> str:
    """Get SQLAlchemy database URL from configuration"""
    config = get_database_config()
    
    if config['driver'] == 'sqlite':
        return f"sqlite:///{config['database']}"
    
    return (
        f"{config['driver']}://"
        f"{config['username']}:{config['password']}"
        f"@{config['host']}:{config['port']}"
        f"/{config['database']}"
    )
