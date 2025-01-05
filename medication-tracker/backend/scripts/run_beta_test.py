"""
Beta Test Launch Script
Critical Path: BETA-TEST-LAUNCH-*
Last Updated: 2025-01-02T12:32:40+01:00

This script orchestrates the beta test launch process, including environment setup,
validation, and monitoring.
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from backend.app.core.beta_validation import BetaValidationRunner
from backend.app.core.validation_records import ValidationRecordKeeper
from backend.app.core.path_validator import PathValidator
from backend.app.core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer
from backend.app.core.monitoring_alerts import MonitoringAlerts
from backend.app.core.metrics_collector import MetricsCollector
from backend.app.core.evidence_collector import EvidenceCollector
from backend.app.core.validation_hooks import ValidationHooks, ValidationStage
from backend.app.core.validation_types import ValidationResult, ValidationStatus
from backend.app.validation.medication_safety import MedicationSafetyValidator
from backend.scripts.check_beta_status import BetaStatusChecker
from backend.scripts.beta_test_setup import BetaTestSetup
from backend.scripts.launch_beta import launch_beta_environment

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/beta_test_launch.log')
    ]
)
logger = logging.getLogger(__name__)

class BetaTestLauncher:
    """Orchestrates the beta test launch process"""
    
    def __init__(self):
        """Initialize beta test launcher"""
        self.setup = BetaTestSetup()
        self.status_checker = BetaStatusChecker()
        self.metrics_collector = MetricsCollector()
        self.evidence_collector = EvidenceCollector()
        self.validation_hooks = ValidationHooks.get_instance()
        self.record_keeper = ValidationRecordKeeper()
        
    async def pre_launch_validation(self) -> bool:
        """Run pre-launch validation checks"""
        logger.info("Running pre-launch validation...")
        
        try:
            # Run environment setup validation
            setup_valid = await self.setup.validate_environment()
            if not setup_valid:
                logger.error("Environment setup validation failed")
                return False
                
            # Check beta status
            status = await self.status_checker.check_status()
            if status["status"] != "healthy":
                logger.error(f"Beta status check failed: {status.get('error', 'Unknown error')}")
                return False
                
            # Run safety validation
            safety_validator = MedicationSafetyValidator()
            safety_results = await safety_validator.validate_all()
            if not safety_results.get("valid", False):
                logger.error("Safety validation failed")
                return False
                
            logger.info("Pre-launch validation completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Pre-launch validation failed: {str(e)}")
            return False
            
    async def launch_beta_test(self) -> Dict[str, Any]:
        """Launch beta test environment"""
        start_time = datetime.now()
        
        try:
            # Step 1: Pre-launch validation
            if not await self.pre_launch_validation():
                return {
                    "status": "failed",
                    "stage": "pre_launch_validation",
                    "timestamp": datetime.now().isoformat(),
                    "error": "Pre-launch validation failed"
                }
                
            # Step 2: Launch beta environment
            logger.info("Launching beta environment...")
            launch_result = await launch_beta_environment()
            if not launch_result.get("success", False):
                return {
                    "status": "failed",
                    "stage": "environment_launch",
                    "timestamp": datetime.now().isoformat(),
                    "error": launch_result.get("error", "Unknown error")
                }
                
            # Step 3: Post-launch validation
            logger.info("Running post-launch validation...")
            status = await self.status_checker.check_status()
            if status["status"] != "healthy":
                return {
                    "status": "failed",
                    "stage": "post_launch_validation",
                    "timestamp": datetime.now().isoformat(),
                    "error": status.get("error", "Post-launch validation failed")
                }
                
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Record successful launch
            self.record_keeper.record_validation_event(
                stage=ValidationStage.POST_LAUNCH,
                result={
                    "valid": True,
                    "message": "Beta test launch completed successfully",
                    "duration": duration
                },
                timestamp=datetime.now()
            )
            
            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "duration": duration,
                "components": {
                    "environment": launch_result,
                    "validation": status
                }
            }
            
        except Exception as e:
            logger.error(f"Beta test launch failed: {str(e)}")
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
            
def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Launch beta test environment")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force launch even if some non-critical validations fail"
    )
    return parser.parse_args()

async def main():
    """Main entry point"""
    try:
        args = parse_args()
        launcher = BetaTestLauncher()
        
        # Launch beta test
        result = await launcher.launch_beta_test()
        
        # Print launch summary
        print(f"\nBeta Test Launch Status: {result['status']}")
        print(f"Timestamp: {result['timestamp']}")
        
        if result["status"] == "success":
            print(f"Duration: {result['duration']:.2f} seconds")
            return 0
        else:
            print(f"Failed at stage: {result.get('stage', 'unknown')}")
            print(f"Error: {result.get('error', 'Unknown error')}")
            return 1
            
    except Exception as e:
        logger.error(f"Beta test launch failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
