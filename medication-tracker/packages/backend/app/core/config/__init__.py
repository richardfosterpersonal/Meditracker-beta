"""
Configuration Package
Critical Path: CONFIG
Last Updated: 2025-01-02T16:08:17+01:00
"""

from .base import BaseConfig
from .provider import ConfigProvider, get_config, config

__all__ = ["BaseConfig", "ConfigProvider", "get_config", "config"]
