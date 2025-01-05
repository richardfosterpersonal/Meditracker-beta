#!/usr/bin/env python3
"""
Beta Validation Checkpoint
Last Updated: 2024-12-27T19:42:43+01:00
Critical Path: Aligned
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.core.beta_validator import beta_validator
from app.core.settings import settings
from app.core.logging import config_logger

logger = config_logger.get_logger(__name__)

async def run_beta_validation():
    """Run beta validation aligned with critical path"""
    logger.info("Starting beta validation checkpoint...")
    
    try:
        # Validate beta readiness
        is_ready = await beta_validator.validate_beta_readiness()
        
        if is_ready:
            logger.info("Beta validation passed successfully!")
            return 0
        else:
            logger.error("Beta validation failed. Check logs for details.")
            return 1
            
    except Exception as e:
        logger.error(f"Error during beta validation: {str(e)}")
        return 1

if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(run_beta_validation()))
