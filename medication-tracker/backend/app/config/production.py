"""
Production Configuration
Last Updated: 2024-12-27T22:43:39+01:00
"""

from pydantic_settings import BaseSettings

class ProductionSettings(BaseSettings):
    # Domain settings
    DOMAIN = "beta.getmedminder.com"
    BASE_URL = f"https://{DOMAIN}"
    
    # Security
    SSL_ENABLED = True
    ALLOWED_HOSTS = [
        "beta.getmedminder.com",
        "www.beta.getmedminder.com"
    ]
    
    # CORS settings
    CORS_ORIGINS = [
        "https://beta.getmedminder.com",
        "https://www.beta.getmedminder.com"
    ]
    
    # Database - using SQLite for beta
    DATABASE_URL = "sqlite:///./beta.db"
    
    # Beta settings
    BETA_MAX_USERS = 10
    BETA_INVITE_ONLY = True
    
    # Email settings (update with your Hostinger email)
    SMTP_HOST = "smtp.hostinger.com"
    SMTP_PORT = 587
    SMTP_USER = "beta@getmedminder.com"
    # SMTP_PASSWORD to be set via environment variable
    
    class Config:
        env_file = ".env"

settings = ProductionSettings()
