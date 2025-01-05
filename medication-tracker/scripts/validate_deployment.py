"""
Pre-deployment Validation Script
Last Updated: 2024-12-27T18:44:02+01:00
Status: ACTIVE
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from app.core.validation import validator
from app.core.logging import config_logger

logger = config_logger.get_logger(__name__)

async def validate_deployment():
    """Run pre-deployment validation"""
    try:
        logger.info("Starting pre-deployment validation...")
        results = await validator.run_validation()
        
        # Check for failures
        failures = [
            r for r in results.values()
            if r.status in ["FAILED", "ERROR"]
        ]
        
        if failures:
            logger.error("Validation failed!")
            for failure in failures:
                logger.error(
                    f"{failure.component} ({failure.priority}): "
                    f"{failure.status} - {failure.message}"
                )
            sys.exit(1)
            
        logger.info("All validations passed!")
        for component, result in results.items():
            logger.info(
                f"{component} ({result.priority}): {result.status}"
            )
            
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(validate_deployment())
