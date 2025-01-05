"""
Application Configuration Management
Last Updated: 2024-12-31T12:35:41+01:00
Critical Path: Core.Config
"""

import os
from pathlib import Path
import logging
from typing import Dict, Any
from functools import lru_cache

from .beta_settings import BetaSettings
from .config_validator import config_validator

logger = logging.getLogger(__name__)

class Settings:
    """Application settings"""
    
    def __init__(self):
        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent
        
        # Version
        self.VERSION = "1.0.0-beta.1"
        
        # Validation settings
        self.VALIDATION_EVIDENCE_PATH = self.BASE_DIR / "data" / "validation_evidence"
        self.VALIDATION_ENABLED = True
        self.VALIDATION_LOG_LEVEL = "INFO"
        
        # Beta settings
        self.BETA_ENABLED = True
        self.BETA_START_DATE = "2025-01-02T14:34:18+01:00"
        self.BETA_END_DATE = "2025-02-02T14:34:18+01:00"
        self.BETA_EVIDENCE_PATH = self.BASE_DIR / "data" / "beta_evidence"
        
        # Monitoring settings
        self.MONITORING_ENABLED = True
        self.HIPAA_COMPLIANCE_ENABLED = True
        
        # Create necessary directories
        self.VALIDATION_EVIDENCE_PATH.mkdir(parents=True, exist_ok=True)
        self.BETA_EVIDENCE_PATH.mkdir(parents=True, exist_ok=True)
        
    def get_validation_config(self) -> Dict[str, Any]:
        """Get validation configuration"""
        return {
            "enabled": self.VALIDATION_ENABLED,
            "log_level": self.VALIDATION_LOG_LEVEL,
            "evidence_path": str(self.VALIDATION_EVIDENCE_PATH)
        }
        
    def get_beta_config(self) -> Dict[str, Any]:
        """Get beta configuration"""
        return {
            "enabled": self.BETA_ENABLED,
            "start_date": self.BETA_START_DATE,
            "end_date": self.BETA_END_DATE,
            "evidence_path": str(self.BETA_EVIDENCE_PATH)
        }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

def initialize_config():
    """Initialize configuration"""
    try:
        settings = BetaSettings()
        
        # Register known configuration keys
        config_validator.register_config_key(
            "DATABASE_URL",
            aliases=["SQLALCHEMY_DATABASE_URI"]
        )
        
        config_validator.register_config_key(
            "BETA_BASE_PATH",
            aliases=["BETA_DATA_PATH"]
        )
        
        config_validator.register_config_key(
            "EVIDENCE_PATH",
            aliases=["BETA_EVIDENCE_PATH"]
        )
        
        config_validator.register_config_key(
            "FEEDBACK_PATH",
            aliases=["BETA_FEEDBACK_PATH"]
        )
        
        config_validator.register_config_key(
            "LOG_PATH",
            aliases=["BETA_LOG_PATH"]
        )
        
        config_validator.register_config_key(
            "DB_PATH",
            aliases=["BETA_DB_PATH"]
        )
        
        config_validator.register_config_key(
            "VALIDATION_EVIDENCE_PATH",
            aliases=["VALIDATION_DATA_PATH"]
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Configuration initialization failed: {str(e)}")
        return False

# Initialize configuration
initialized = initialize_config()

# Export settings instance
settings = get_settings()
