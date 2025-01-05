"""
Beta Testing Initialization Script
Initializes and starts internal beta testing phase
Last Updated: 2024-12-30T23:08:51+01:00
"""

import asyncio
import logging
from pathlib import Path
import sys
import os

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.app.core.beta_initializer import BetaInitializer
from backend.app.core.beta_critical_path_monitor import BetaCriticalPathMonitor
from backend.app.core.beta_process_enforcer import BetaProcessEnforcer, ProcessType
from backend.app.core.beta_settings import BetaSettings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_directories():
    """Create required directories"""
    try:
        settings = BetaSettings()
        
        # Create base directories
        directories = [
            settings.BETA_BASE_PATH,
            settings.BETA_EVIDENCE_PATH,
            settings.BETA_FEEDBACK_PATH,
            settings.BETA_LOGS_PATH,
            settings.BETA_BASE_PATH / "db"
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            logger.info(f"Created directory: {directory}")
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to create directories: {str(e)}")
        return False

async def initialize_beta_testing():
    """Initialize beta testing infrastructure"""
    logger.info("Starting beta testing initialization...")
    
    initializer = BetaInitializer()
    monitor = BetaCriticalPathMonitor()
    enforcer = BetaProcessEnforcer()
    
    try:
        # Create directories
        if not create_directories():
            logger.error("Directory creation failed")
            return False
            
        # Initialize infrastructure
        init_result = await initializer.initialize_beta_testing()
        if not init_result["success"]:
            logger.error(f"Initialization failed: {init_result['error']}")
            return False
            
        logger.info("Beta testing infrastructure initialized successfully")
        
        # Start internal phase
        kickoff_result = await initializer.kickoff_beta_phase("internal")
        if not kickoff_result["success"]:
            logger.error(f"Phase kickoff failed: {kickoff_result['error']}")
            return False
            
        logger.info("Internal beta phase kicked off successfully")
        
        # Verify critical path
        monitor_result = await monitor.monitor_critical_path("internal")
        if not monitor_result["success"]:
            logger.error(f"Critical path monitoring failed: {monitor_result['error']}")
            return False
            
        logger.info("Critical path monitoring started successfully")
        
        # Start validation process
        validation_result = await enforcer.enforce_process(
            ProcessType.VALIDATION,
            "internal",
            {}
        )
        if not validation_result["success"]:
            logger.error(f"Validation process failed: {validation_result['error']}")
            return False
            
        logger.info("Validation process started successfully")
        
        # Log initialization summary
        logger.info("\nBeta Testing Initialization Summary:")
        logger.info(f"- Infrastructure: {init_result['message']}")
        logger.info(f"- Phase Kickoff: {kickoff_result['message']}")
        logger.info(f"- Critical Path: {monitor_result.get('state', 'Unknown')}")
        logger.info("- Validation: Started")
        
        return True
        
    except Exception as e:
        logger.error(f"Beta initialization failed with error: {str(e)}")
        return False

def main():
    """Main entry point"""
    try:
        # Run initialization
        success = asyncio.run(initialize_beta_testing())
        
        if success:
            logger.info("\nBeta testing initialized successfully!")
            logger.info("You can now access the beta dashboard to monitor progress.")
            sys.exit(0)
        else:
            logger.error("\nBeta testing initialization failed!")
            logger.error("Please check the logs for details.")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"\nFatal error during initialization: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
