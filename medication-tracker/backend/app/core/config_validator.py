"""
Configuration Validator
Last Updated: 2024-12-31T11:23:17+01:00
Critical Path: Configuration
"""

import os
import asyncio
from typing import Any, Dict, List, Optional, Set, Callable
from datetime import datetime
from contextlib import contextmanager
from .logging import config_logger

class ConfigurationHook:
    """Configuration hook system maintaining critical path alignment"""
    
    def __init__(self):
        self.pre_hooks: Dict[str, List[Callable]] = {}
        self.post_hooks: Dict[str, List[Callable]] = {}
        self.logger = config_logger.get_logger(__name__)
    
    async def execute_pre_hooks(
        self,
        key: str,
        value: Any
    ) -> Any:
        """Execute pre-validation hooks"""
        if key in self.pre_hooks:
            for hook in self.pre_hooks[key]:
                try:
                    value = await hook(value)
                except Exception as e:
                    self.logger.error(
                        f"Pre-hook error for {key}: {str(e)}"
                    )
        return value
    
    async def execute_post_hooks(
        self,
        key: str,
        value: Any
    ) -> None:
        """Execute post-validation hooks"""
        if key in self.post_hooks:
            for hook in self.post_hooks[key]:
                try:
                    await hook(value)
                except Exception as e:
                    self.logger.error(
                        f"Post-hook error for {key}: {str(e)}"
                    )

class ConfigValidator:
    """Configuration validator ensuring critical path alignment"""
    
    def __init__(self):
        self._hook_system = ConfigurationHook()
        self._known_keys: Set[str] = set()
        self._aliases: Dict[str, str] = {}
        self._validators: Dict[str, Callable] = {}
        self.logger = config_logger.get_logger(__name__)
    
    def register_config_key(
        self,
        key: str,
        aliases: Optional[List[str]] = None,
        validator: Optional[Callable] = None
    ) -> None:
        """Register a configuration key with optional aliases and validator"""
        self._known_keys.add(key)
        if aliases:
            for alias in aliases:
                self._aliases[alias] = key
        if validator:
            self._validators[key] = validator
    
    def register_pre_hook(
        self,
        key: str,
        hook: Callable
    ) -> None:
        """Register a pre-validation hook"""
        if key not in self._hook_system.pre_hooks:
            self._hook_system.pre_hooks[key] = []
        self._hook_system.pre_hooks[key].append(hook)
    
    def register_post_hook(
        self,
        key: str,
        hook: Callable
    ) -> None:
        """Register a post-validation hook"""
        if key not in self._hook_system.post_hooks:
            self._hook_system.post_hooks[key] = []
        self._hook_system.post_hooks[key].append(hook)
    
    @contextmanager
    def validation_context(self, key: str):
        """Context manager for validation"""
        canonical_key = self._aliases.get(key, key)
        if canonical_key not in self._known_keys:
            self.logger.warning(f"Unregistered config key: {key}")
            self._known_keys.add(canonical_key)
        yield canonical_key
    
    async def validate_config(
        self,
        key: str,
        value: Any
    ) -> Any:
        """Validate configuration value"""
        with self.validation_context(key) as canonical_key:
            # Execute pre-hooks
            value = await self._hook_system.execute_pre_hooks(
                canonical_key,
                value
            )
            
            # Run validator if exists
            if canonical_key in self._validators:
                try:
                    value = self._validators[canonical_key](value)
                except Exception as e:
                    self.logger.error(
                        f"Validation failed for {canonical_key}: {str(e)}"
                    )
                    raise
            
            # Execute post-hooks asynchronously
            asyncio.create_task(
                self._hook_system.execute_post_hooks(canonical_key, value)
            )
            
            return value

# Create singleton instance
config_validator = ConfigValidator()

def register_config_keys():
    """Register known configuration keys and aliases"""
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

# Initialize configuration keys
register_config_keys()
