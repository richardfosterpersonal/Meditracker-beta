"""Logging configuration for the application."""
import logging
import sys
from pathlib import Path
from typing import Optional

def setup_logging(log_file: Optional[Path] = None) -> None:
    """Setup logging configuration."""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            *(
                [logging.FileHandler(str(log_file))]
                if log_file is not None
                else []
            ),
        ],
    )

def log_error(error: Exception, logger: logging.Logger) -> None:
    """Log an error with traceback."""
    logger.exception(f"Error occurred: {str(error)}")
