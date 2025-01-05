"""
Beta Testing Startup Script
Critical Path: BETA-STARTUP-*
Last Updated: 2025-01-02T11:10:53+01:00
"""

import asyncio
import logging
from pathlib import Path
import sys
from datetime import datetime

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from app.core.beta_validation import BetaValidationRunner
from app.core.validation_records import ValidationRecordKeeper
from app.core.path_validator import PathValidator
from app.core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer
from app.core.monitoring_alerts import MonitoringAlerts
from app.core.metrics_collector import MetricsCollector
from app.core.evidence_collector import EvidenceCollector
from app.core.validation_hooks import ValidationHooks, ValidationStage, ValidationHookPriority
from app.core.validation_types import ValidationResult, ValidationStatus, ValidationLevel
from app.validation.final_validation_suite import FinalValidationSuite
from app.validation.core import ValidationCore
from app.validation.beta_validation_tracker import BetaValidationTracker
from app.validation.medication_safety import MedicationSafetyValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

async def run_pre_validation() -> bool:
    """Run pre-validation checks using dynamic validation framework"""
    try:
        logger.info("Starting pre-validation...")
        
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
        
        # Initialize beta validator with all components
        beta_validator = BetaValidationRunner(
            validation_hooks=validation_hooks,
            record_keeper=record_keeper,
            path_validator=path_validator,
            critical_path_analyzer=critical_path_analyzer,
            monitoring_alerts=monitoring_alerts
        )
        
        # Run pre-validation stage
        logger.info("Running pre-validation stage...")
        result = await beta_validator.validate_stage(ValidationStage.PRE_VALIDATION)
        
        if not result["valid"]:
            logger.error("Pre-validation failed:")
            for error in result.get("errors", []):
                logger.error(f"- {error}")
            return False
            
        # Record validation results
        record_keeper.record_validation_event(
            stage=ValidationStage.PRE_VALIDATION,
            result=result,
            timestamp=datetime.now()
        )
        
        logger.info("Pre-validation completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Pre-validation failed with error: {str(e)}")
        return False

async def start_beta_testing() -> bool:
    """Start beta testing with dynamic validation framework"""
    try:
        # Step 1: Run pre-validation
        if not await run_pre_validation():
            logger.error("Pre-validation failed - cannot proceed with beta testing")
            return False
            
        # Step 2: Run final validation suite
        logger.info("Running final validation suite...")
        validation_suite = FinalValidationSuite()
        suite_results = await validation_suite.run_full_validation()
        
        if not suite_results.get("valid", False):
            logger.error(f"Final validation suite failed: {suite_results.get('error')}")
            return False
            
        logger.info("Final validation suite passed")
        
        # Step 3: Run validation core with mandatory hooks
        logger.info("Running validation core...")
        validation_core = ValidationCore()
        core_results = await validation_core.validate_with_hooks()
        
        if not core_results.get("valid", False):
            logger.error(f"Validation core failed: {core_results.get('error')}")
            return False
            
        logger.info("Validation core passed")
        
        # Step 4: Initialize and start beta tracking
        logger.info("Initializing beta tracking...")
        beta_tracker = BetaValidationTracker()
        await beta_tracker.initialize()
        
        # Step 5: Final medication safety check
        logger.info("Running medication safety validation...")
        safety_validator = MedicationSafetyValidator()
        safety_results = await safety_validator.validate_all()
        
        if not safety_results.get("valid", False):
            logger.error(f"Medication safety validation failed: {safety_results.get('error')}")
            return False
            
        logger.info("Medication safety validation passed")
        
        # Step 6: Start beta monitoring
        logger.info("Starting beta monitoring...")
        monitoring_alerts = MonitoringAlerts(
            metrics_collector=MetricsCollector(),
            evidence_collector=EvidenceCollector()
        )
        await monitoring_alerts.validate_alerts()
        
        logger.info("Beta testing started successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to start beta testing: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(start_beta_testing())
    if not success:
        sys.exit(1)
