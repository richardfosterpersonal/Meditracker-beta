"""
Contract Maintenance Script
Last Updated: 2025-01-03T23:50:39+01:00
"""

import asyncio
import logging
from pathlib import Path

from app.infrastructure.maintenance.contract_maintainer import get_maintainer

async def maintain_contract():
    """Run contract maintenance"""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger("contract.maintenance")
    
    try:
        # Get project root
        project_root = Path(__file__).parent.parent
        
        # Initialize maintainer
        maintainer = get_maintainer(project_root)
        
        logger.info("Starting contract maintenance...")
        
        # Update contract and documentation
        await maintainer.update_contract()
        
        logger.info("Contract maintenance completed successfully")
        
    except Exception as e:
        logger.error(f"Contract maintenance failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(maintain_contract())
