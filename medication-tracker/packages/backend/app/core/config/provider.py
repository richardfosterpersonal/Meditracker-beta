"""
Configuration Provider
Critical Path: CONFIG
Last Updated: 2025-01-02T16:08:17+01:00
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from functools import lru_cache

from .base import BaseConfig

class ConfigProvider(BaseConfig):
    """Configuration provider implementation"""
    
    def __init__(self):
        self._base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self._config: Dict[str, Any] = {
            "version": "1.0.0-beta.1",
            "environment": os.getenv("APP_ENV", "development"),
            "paths": {
                "data": str(self._base_dir / "data"),
                "validation_evidence": str(self._base_dir / "data" / "validation_evidence"),
                "beta_evidence": str(self._base_dir / "data" / "beta_evidence"),
                "logs": str(self._base_dir / "logs")
            },
            "database": {
                "url": os.getenv("DATABASE_URL", "sqlite:///./app.db"),
                "pool_size": 10,
                "max_overflow": 20,
                "pool_timeout": 30,
                "pool_recycle": 1800
            },
            "features": {
                "validation": {
                    "enabled": True,
                    "log_level": "INFO",
                    "collect_evidence": True
                },
                "beta": {
                    "enabled": True,
                    "start_date": "2025-01-02T16:08:17+01:00",
                    "end_date": "2025-02-02T16:08:17+01:00",
                    "collect_evidence": True
                },
                "monitoring": {
                    "enabled": True,
                    "hipaa_compliant": True
                }
            }
        }
        
        # Create necessary directories
        self._create_directories()
        
    def _create_directories(self) -> None:
        """Create necessary directories"""
        for path in self._config["paths"].values():
            Path(path).mkdir(parents=True, exist_ok=True)
            
    @property
    def base_dir(self) -> Path:
        """Get base directory"""
        return self._base_dir
        
    @property
    def version(self) -> str:
        """Get version"""
        return self._config["version"]
        
    @property
    def environment(self) -> str:
        """Get environment"""
        return self._config["environment"]
        
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return self._config["database"]["url"]
        
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return self._config["database"]
        
    def get_path(self, key: str) -> Path:
        """Get path configuration"""
        path_str = self._config["paths"].get(key)
        if not path_str:
            raise KeyError(f"Path not found: {key}")
        return Path(path_str)
        
    def get_bool(self, key: str) -> bool:
        """Get boolean configuration"""
        keys = key.split(".")
        value = self._get_nested_value(keys)
        if not isinstance(value, bool):
            raise ValueError(f"Value for {key} is not a boolean")
        return value
        
    def get_str(self, key: str) -> str:
        """Get string configuration"""
        keys = key.split(".")
        value = self._get_nested_value(keys)
        if not isinstance(value, str):
            raise ValueError(f"Value for {key} is not a string")
        return value
        
    def get_int(self, key: str) -> int:
        """Get integer configuration"""
        keys = key.split(".")
        value = self._get_nested_value(keys)
        if not isinstance(value, int):
            raise ValueError(f"Value for {key} is not an integer")
        return value
        
    def get_dict(self, key: str) -> Dict[str, Any]:
        """Get dictionary configuration"""
        keys = key.split(".")
        value = self._get_nested_value(keys)
        if not isinstance(value, dict):
            raise ValueError(f"Value for {key} is not a dictionary")
        return value
        
    def _get_nested_value(self, keys: list) -> Any:
        """Get nested configuration value"""
        value = self._config
        for key in keys:
            if not isinstance(value, dict):
                raise KeyError(f"Invalid configuration path: {'.'.join(keys)}")
            if key not in value:
                raise KeyError(f"Configuration not found: {'.'.join(keys)}")
            value = value[key]
        return value

@lru_cache()
def get_config() -> ConfigProvider:
    """Get cached configuration instance"""
    return ConfigProvider()

# Global configuration instance
config = get_config()
