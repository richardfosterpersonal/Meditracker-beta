"""
Logging Configuration
Last Updated: 2024-12-27T18:44:02+01:00
Critical Path: Logging
"""

import logging
import sys
import os
from typing import Any, Dict
from datetime import datetime
from pathlib import Path

class ConfigLogger:
    """Configuration logger with critical path alignment"""
    
    def __init__(self):
        self.loggers = {}
        
    def get_logger(self, name: str) -> logging.Logger:
        """Get or create a logger instance"""
        if name in self.loggers:
            return self.loggers[name]
            
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG)
        
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        
        # File handler
        file_handler = logging.FileHandler(
            log_dir / "config_validation.log"
        )
        file_handler.setLevel(logging.DEBUG)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        # Add handlers
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        
        self.loggers[name] = logger
        return logger
    
    def _log(
        self,
        logger: logging.Logger,
        level: int,
        event: str,
        **kwargs: Any
    ) -> None:
        """Log a message with additional context"""
        context = {
            "timestamp": datetime.now().isoformat(),
            "environment": os.getenv("ENV", "development"),
            **kwargs
        }
        logger.log(level, f"{event} | Context: {context}")

class BetaLogger(ConfigLogger):
    """Beta-specific logger with enhanced tracking"""
    
    def __init__(self):
        super().__init__()
        self.logger = self.get_logger("beta_logger")
    
    def info(self, event: str, **kwargs: Any) -> None:
        """Log info level message"""
        self._log(self.logger, logging.INFO, event, **kwargs)
    
    def error(self, event: str, **kwargs: Any) -> None:
        """Log error level message"""
        self._log(self.logger, logging.ERROR, event, **kwargs)
    
    def warning(self, event: str, **kwargs: Any) -> None:
        """Log warning level message"""
        self._log(self.logger, logging.WARNING, event, **kwargs)
    
    def debug(self, event: str, **kwargs: Any) -> None:
        """Log debug level message"""
        self._log(self.logger, logging.DEBUG, event, **kwargs)

# Create singleton instances
config_logger = ConfigLogger()
beta_logger = BetaLogger()
