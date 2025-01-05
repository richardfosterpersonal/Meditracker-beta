"""
Beta Test Runner
Critical Path: BETA-TEST-*
Last Updated: 2025-01-02T12:49:23+01:00

Launches and manages the beta test environment.
"""

import asyncio
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from .beta_validation import BetaValidationRunner
from .beta_launch_manager import BetaLaunchManager
from .beta_deployment_orchestrator import BetaDeploymentOrchestrator
from .beta_monitoring import BetaMonitoring
from .beta_metrics import BetaMetrics
from .beta_user_manager import BetaUserManager
from .beta_data_manager import BetaDataManager
from .beta_feature_flags import BetaFeatureFlagManager
from backend.app.exceptions import BetaValidationError, BetaLaunchError

logger = logging.getLogger(__name__)

class BetaTestRunner:
    """Manages the beta test environment"""
    
    def __init__(self):
        self.validator = BetaValidationRunner()
        self.launch_manager = BetaLaunchManager()
        self.deployment = BetaDeploymentOrchestrator()
        self.monitoring = BetaMonitoring()
        self.metrics = BetaMetrics(Path("data/beta"))
        self.user_manager = BetaUserManager()
        self.data_manager = BetaDataManager()
        self.feature_flags = BetaFeatureFlagManager()
        
    async def launch_beta(self) -> None:
        """Launch the beta test environment"""
        try:
            # Step 1: Run pre-launch validation
            logger.info("Running pre-launch validation...")
            validation_result = await self.validator.validate_beta_readiness()
            if not validation_result.valid:
                raise BetaValidationError(f"Pre-launch validation failed: {validation_result.message}")
                
            # Step 2: Validate launch plan
            logger.info("Validating launch plan...")
            launch_plan_valid = await self.launch_manager.validate_launch_plan()
            if not launch_plan_valid:
                raise BetaLaunchError("Launch plan validation failed")
                
            # Step 3: Deploy beta environment
            logger.info("Deploying beta environment...")
            deployment_result = await self.deployment.deploy_beta()
            if not deployment_result["success"]:
                raise BetaLaunchError(f"Beta deployment failed: {deployment_result['error']}")
                
            # Step 4: Initialize monitoring and metrics
            logger.info("Initializing monitoring and metrics...")
            await self.monitoring.initialize_monitoring()
            await self.metrics.initialize_metrics()
            
            # Step 5: Prepare user management
            logger.info("Preparing user management...")
            await self.user_manager.initialize_user_system()
            
            # Step 6: Initialize data management
            logger.info("Initializing data management...")
            await self.data_manager.initialize_data_system()
            
            # Step 7: Configure feature flags
            logger.info("Configuring feature flags...")
            await self.feature_flags.initialize_flags()
            
            logger.info("Beta test environment launched successfully!")
            
        except Exception as e:
            logger.error(f"Failed to launch beta test environment: {str(e)}")
            raise BetaLaunchError(f"Beta launch failed: {str(e)}")

async def run_beta() -> None:
    """Run the beta test environment"""
    try:
        runner = BetaTestRunner()
        await runner.launch_beta()
        
    except Exception as e:
        logger.error(f"Beta test failed: {str(e)}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_beta())
