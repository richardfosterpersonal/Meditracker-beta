"""
Settings module for the application.
Handles all configuration and environment variables.
"""

from typing import List, Optional, Union, Dict, ClassVar
from pydantic import (
    AnyHttpUrl,
    field_validator,
    model_validator
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import secrets
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings with validation"""
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=os.getenv("ENV_FILE", ".env"),
        extra='allow'  # Allow extra fields like HASH_ALGORITHM
    )
    
    # Project paths
    PROJECT_ROOT: str = str(Path(__file__).parent.parent.parent)
    VALIDATION_EVIDENCE_PATH: str = str(Path(PROJECT_ROOT) / "validation_evidence")
    BETA_EVIDENCE_PATH: str = str(Path(VALIDATION_EVIDENCE_PATH) / "beta")
    
    # Beta testing configuration
    BETA_PHASES: ClassVar[Dict] = {
        "internal": {
            "duration_weeks": 2,
            "max_users": 3,
            "required_validations": ["core_functionality", "safety_checks"]
        },
        "limited": {
            "duration_weeks": 4,
            "max_users": 20,
            "required_validations": ["performance", "user_experience"]
        },
        "open": {
            "duration_weeks": 8,
            "max_users": 50,
            "required_validations": ["scalability", "stability"]
        }
    }
    
    # Validation requirements
    VALIDATION_REQUIREMENTS: ClassVar[Dict] = {
        "beta_testing": {
            "required_files": [
                "beta_test_setup.py",
                "beta_monitoring.py",
                "beta_feedback.py"
            ],
            "required_docs": [
                "BETA_TESTING.md",
                "BETA_ACCESS.md"
            ]
        }
    }
    
    # Basic
    PROJECT_NAME: str = "Medication Tracker"
    VERSION: str = "1.0.0"
    
    # Application settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str
    
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL, allowing both PostgreSQL and SQLite"""
        if v.startswith("sqlite:///"):
            return v
        if not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("Database URL must be PostgreSQL or SQLite")
        return v
    
    # Security
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: str) -> List[str]:
        """Convert comma-separated string to list"""
        return [origin.strip() for origin in v.split(",")]
    
    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    VALIDATION_LOG_LEVEL: str = "debug"
    VALIDATION_EVIDENCE_PATH: str = str(Path(PROJECT_ROOT) / "validation_evidence")
    
    # Beta Configuration
    BETA_MODE: bool = True
    BETA_ACCESS_KEY: str = secrets.token_urlsafe(16)
    BETA_VALIDATION_INTERVAL: int = 3600
    BETA_BACKUP_INTERVAL: int = 86400
    BETA_USER_VALIDATION: bool = True
    BETA_ACCESS_CONTROL: bool = True
    BETA_AUDIT_LOGGING: bool = True
    BETA_FEATURE_FLAGS: bool = True
    BETA_USER_LIMIT: int = 50
    BETA_FEEDBACK_EMAIL: str = "feedback@medminder.com"
    
    # External Access
    EXTERNAL_URL: Optional[AnyHttpUrl] = None
    
    # Monitoring
    MONITORING_ENABLED: bool = True
    MONITORING_INTERVAL: int = 60
    MONITORING_EVIDENCE_PATH: str = "logs/monitoring"
    
    # Development
    DEBUG: bool = True
    
    # HIPAA Compliance
    HIPAA_COMPLIANCE_ENABLED: bool = True
    PHI_PROTECTION_LEVEL: str = "high"
    AUDIT_TRAIL_ENABLED: bool = True
    ACCESS_CONTROL_STRICT: bool = True
    
    # Validation
    VALIDATION_INTERVAL_MINUTES: int = 60
    
    @model_validator(mode='after')
    def validate_all(self) -> 'Settings':
        """Validate all settings after model creation"""
        # Ensure critical paths exist
        if self.LOG_FILE:
            log_dir = self.LOG_FILE.rsplit('/', 1)[0]
            os.makedirs(log_dir, exist_ok=True)
        if self.VALIDATION_EVIDENCE_PATH:
            os.makedirs(self.VALIDATION_EVIDENCE_PATH, exist_ok=True)
        if self.MONITORING_EVIDENCE_PATH:
            os.makedirs(self.MONITORING_EVIDENCE_PATH, exist_ok=True)
        return self

# Create settings instance
settings = Settings()

# Create required directories
Path(settings.VALIDATION_EVIDENCE_PATH).mkdir(parents=True, exist_ok=True)
Path(settings.BETA_EVIDENCE_PATH).mkdir(parents=True, exist_ok=True)

# Make settings singleton
@lru_cache()
def get_settings() -> Settings:
    return settings
