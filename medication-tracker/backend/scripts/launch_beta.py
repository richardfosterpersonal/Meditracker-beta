"""
Beta Launch Script
Critical Path: BETA-LAUNCH-*
Last Updated: 2025-01-02T11:14:08+01:00
"""

import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, project_root)

from backend.app.core.beta_validation import BetaValidationRunner
from backend.app.core.validation_records import ValidationRecordKeeper
from backend.app.core.path_validator import PathValidator
from backend.app.core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer
from backend.app.core.monitoring_alerts import MonitoringAlerts
from backend.app.core.metrics_collector import MetricsCollector
from backend.app.core.evidence_collector import EvidenceCollector
from backend.app.core.validation_hooks import ValidationHooks, ValidationStage
from backend.app.core.validation_types import ValidationResult, ValidationStatus, ValidationLevel
from backend.app.validation.final_validation_suite import FinalValidationSuite
from backend.app.validation.core import ValidationCore
from backend.app.validation.medication_safety import MedicationSafetyValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

async def execute_launch():
    """Execute beta launch with full validation"""
    try:
        logger.info("Starting beta launch process...")
        start_time = datetime.now()
        
        # Initialize components
        metrics_collector = MetricsCollector()
        evidence_collector = EvidenceCollector()
        validation_hooks = ValidationHooks.get_instance()
        record_keeper = ValidationRecordKeeper()
        path_validator = PathValidator()
        critical_path_analyzer = BetaCriticalPathAnalyzer()
        monitoring_alerts = MonitoringAlerts(
            metrics_collector=metrics_collector,
            evidence_collector=evidence_collector
        )
        
        # Initialize beta validator
        beta_validator = BetaValidationRunner(
            validation_hooks=validation_hooks,
            record_keeper=record_keeper,
            path_validator=path_validator,
            critical_path_analyzer=critical_path_analyzer,
            monitoring_alerts=monitoring_alerts
        )
        
        # Step 1: Run pre-validation stage
        logger.info("Running pre-validation stage...")
        pre_result = await beta_validator.validate_stage(ValidationStage.PRE_VALIDATION)
        if not pre_result["valid"]:
            logger.error("Pre-validation stage failed:")
            for error in pre_result.get("errors", []):
                logger.error(f"- {error}")
            return False
            
        # Step 2: Run validation stage
        logger.info("Running validation stage...")
        validation_result = await beta_validator.validate_stage(ValidationStage.VALIDATION)
        if not validation_result["valid"]:
            logger.error("Validation stage failed:")
            for error in validation_result.get("errors", []):
                logger.error(f"- {error}")
            return False
            
        # Step 3: Run post-validation stage
        logger.info("Running post-validation stage...")
        post_result = await beta_validator.validate_stage(ValidationStage.POST_VALIDATION)
        if not post_result["valid"]:
            logger.error("Post-validation stage failed:")
            for error in post_result.get("errors", []):
                logger.error(f"- {error}")
            return False
            
        # Step 4: Final safety checks
        logger.info("Running final safety checks...")
        safety_validator = MedicationSafetyValidator()
        safety_results = await safety_validator.validate_all()
        if not safety_results.get("valid", False):
            logger.error(f"Safety validation failed: {safety_results.get('error')}")
            return False
            
        # Step 5: Start monitoring
        logger.info("Starting monitoring system...")
        await monitoring_alerts.validate_alerts()
        
        # Record final validation state
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        record_keeper.record_validation_event(
            stage=ValidationStage.POST_VALIDATION,
            result={
                "valid": True,
                "message": "Beta launch completed successfully",
                "duration": duration,
                "stages": {
                    "pre_validation": pre_result,
                    "validation": validation_result,
                    "post_validation": post_result,
                    "safety": safety_results
                }
            },
            timestamp=end_time
        )
        
        logger.info(f"Beta launch completed successfully in {duration:.2f} seconds")
        return True
        
    except Exception as e:
        logger.error(f"Beta launch failed with error: {str(e)}")
        return False

async def main():
    """Main entry point"""
    try:
        success = await execute_launch()
        if not success:
            logger.error("Beta launch failed")
            sys.exit(1)
            
        logger.info("Beta launch successful")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to execute beta launch: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
