"""
Beta Validation Script
Last Updated: 2024-12-27T19:07:24+01:00
Status: ACTIVE
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from app.core.beta_validator import beta_validator
from app.core.logging import config_logger

logger = config_logger.get_logger(__name__)

async def validate_beta():
    """Run beta validation"""
    try:
        logger.info("Starting beta validation...")
        is_ready = await beta_validator.validate_beta_readiness()
        
        # Log results
        beta_validator.log_validation_results()
        
        if not is_ready:
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Beta validation error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(validate_beta())
