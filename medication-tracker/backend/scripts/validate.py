"""
Validation Script
Critical Path: VALIDATION-*
Last Updated: 2025-01-02T12:28:12+01:00

This script provides a command-line interface for running validations
using the new dynamic validation framework.
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from backend.app.core.beta_validation import BetaValidationRunner
from backend.app.core.validation_records import ValidationRecordKeeper
from backend.app.core.path_validator import PathValidator
from backend.app.core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer
from backend.app.core.monitoring_alerts import MonitoringAlerts
from backend.app.core.metrics_collector import MetricsCollector
from backend.app.core.evidence_collector import EvidenceCollector
from backend.app.core.validation_hooks import ValidationHooks, ValidationStage
from backend.app.core.validation_types import ValidationResult, ValidationStatus, ValidationLevel
from backend.app.validation.medication_safety import MedicationSafetyValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/validation.log')
    ]
)
logger = logging.getLogger(__name__)

class ValidationRunner:
    """Validation Runner for command-line interface"""
    
    def __init__(self):
        """Initialize validation runner"""
        self.metrics_collector = MetricsCollector()
        self.evidence_collector = EvidenceCollector()
        self.validation_hooks = ValidationHooks.get_instance()
        self.record_keeper = ValidationRecordKeeper()
        self.path_validator = PathValidator()
        self.critical_path_analyzer = BetaCriticalPathAnalyzer()
        self.monitoring_alerts = MonitoringAlerts(
            metrics_collector=self.metrics_collector,
            evidence_collector=self.evidence_collector
        )
        
        # Initialize beta validator
        self.beta_validator = BetaValidationRunner(
            validation_hooks=self.validation_hooks,
            record_keeper=self.record_keeper,
            path_validator=self.path_validator,
            critical_path_analyzer=self.critical_path_analyzer,
            monitoring_alerts=self.monitoring_alerts
        )
        
    async def validate_stage(self, stage: ValidationStage) -> ValidationResult:
        """Run validation for a specific stage"""
        try:
            logger.info(f"Running {stage.name} validation...")
            result = await self.beta_validator.validate_stage(stage)
            
            if not result["valid"]:
                logger.error(f"{stage.name} validation failed:")
                for error in result.get("errors", []):
                    logger.error(f"- {error}")
                    
            return result
            
        except Exception as e:
            logger.error(f"{stage.name} validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"{stage.name} validation error: {str(e)}"
            )
            
    async def validate_all(self) -> Dict[str, Any]:
        """Run all validation stages"""
        start_time = datetime.now()
        results = {}
        
        try:
            # Run all validation stages
            for stage in ValidationStage:
                results[stage.name] = await self.validate_stage(stage)
                
            # Run safety validation
            logger.info("Running safety validation...")
            safety_validator = MedicationSafetyValidator()
            safety_results = await safety_validator.validate_all()
            results["safety"] = safety_results
            
            # Calculate overall status
            is_valid = all(r.get("valid", False) for r in results.values())
            duration = (datetime.now() - start_time).total_seconds()
            
            # Record validation results
            self.record_keeper.record_validation_event(
                stage=ValidationStage.POST_VALIDATION,
                result={
                    "valid": is_valid,
                    "message": "Validation completed",
                    "duration": duration,
                    "stages": results
                },
                timestamp=datetime.now()
            )
            
            return {
                "status": "success" if is_valid else "failed",
                "duration": duration,
                "stages": results
            }
            
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "stages": results
            }
            
def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Run validation checks")
    parser.add_argument(
        "--stage",
        choices=[stage.name for stage in ValidationStage],
        help="Specific validation stage to run"
    )
    parser.add_argument(
        "--safety",
        action="store_true",
        help="Run safety validation only"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all validation stages"
    )
    return parser.parse_args()

async def main():
    """Main entry point"""
    try:
        args = parse_args()
        runner = ValidationRunner()
        
        if args.safety:
            # Run safety validation only
            logger.info("Running safety validation...")
            safety_validator = MedicationSafetyValidator()
            result = await safety_validator.validate_all()
            
        elif args.stage:
            # Run specific validation stage
            stage = ValidationStage[args.stage]
            result = await runner.validate_stage(stage)
            
        else:
            # Run all validation stages
            result = await runner.validate_all()
            
        # Print results
        if result["status"] == "success":
            logger.info("Validation completed successfully")
            return 0
        else:
            logger.error("Validation failed")
            return 1
            
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
