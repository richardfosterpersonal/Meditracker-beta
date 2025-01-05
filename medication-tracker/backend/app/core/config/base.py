"""
Base Configuration Interface
Critical Path: CONFIG
Last Updated: 2025-01-02T16:08:17+01:00
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path

class BaseConfig(ABC):
    """Base configuration interface"""
    
    @property
    @abstractmethod
    def base_dir(self) -> Path:
        """Get base directory"""
        pass
        
    @property
    @abstractmethod
    def version(self) -> str:
        """Get version"""
        pass
        
    @property
    @abstractmethod
    def environment(self) -> str:
        """Get environment"""
        pass
        
    @abstractmethod
    def get_path(self, key: str) -> Path:
        """Get path configuration"""
        pass
        
    @abstractmethod
    def get_bool(self, key: str) -> bool:
        """Get boolean configuration"""
        pass
        
    @abstractmethod
    def get_str(self, key: str) -> str:
        """Get string configuration"""
        pass
        
    @abstractmethod
    def get_int(self, key: str) -> int:
        """Get integer configuration"""
        pass
        
    @abstractmethod
    def get_dict(self, key: str) -> Dict[str, Any]:
        """Get dictionary configuration"""
        pass
