"""
Beta Launch Manager
Critical Path: BETA-LAUNCH-MANAGER-*
Last Updated: 2025-01-02T11:14:08+01:00
"""

import logging
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
from backend.app.core.validation_types import ValidationResult, ValidationStatus, ValidationLevel
from backend.app.validation.medication_safety import MedicationSafetyValidator

logger = logging.getLogger(__name__)

class BetaLaunch:
    """Beta Launch Manager"""
    
    def __init__(self):
        """Initialize beta launch manager"""
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
        
    async def _validate_pre_launch(self) -> ValidationResult:
        """Validate environment before launch"""
        try:
            logger.info("Running pre-launch validation...")
            result = await self.beta_validator.validate_stage(ValidationStage.PRE_VALIDATION)
            
            if not result["valid"]:
                logger.error("Pre-launch validation failed:")
                for error in result.get("errors", []):
                    logger.error(f"- {error}")
                    
            return result
            
        except Exception as e:
            logger.error(f"Pre-launch validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Pre-launch validation error: {str(e)}"
            )
            
    async def _validate_runtime(self) -> ValidationResult:
        """Validate environment at runtime"""
        try:
            logger.info("Running runtime validation...")
            result = await self.beta_validator.validate_stage(ValidationStage.VALIDATION)
            
            if not result["valid"]:
                logger.error("Runtime validation failed:")
                for error in result.get("errors", []):
                    logger.error(f"- {error}")
                    
            return result
            
        except Exception as e:
            logger.error(f"Runtime validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Runtime validation error: {str(e)}"
            )
            
    async def launch(self) -> Dict[str, Any]:
        """
        Launch beta environment
        Critical Path: Beta.Launch
        """
        start_time = datetime.now()
        try:
            # Step 1: Pre-launch validation
            pre_launch_result = await self._validate_pre_launch()
            if not pre_launch_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "pre_launch",
                    "error": pre_launch_result.get("message", "Pre-launch validation failed")
                }
                
            # Step 2: Runtime validation
            runtime_result = await self._validate_runtime()
            if not runtime_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "runtime",
                    "error": runtime_result.get("message", "Runtime validation failed")
                }
                
            # Step 3: Final safety check
            logger.info("Running final safety checks...")
            safety_validator = MedicationSafetyValidator()
            safety_results = await safety_validator.validate_all()
            
            if not safety_results.get("valid", False):
                return {
                    "status": "failed",
                    "stage": "safety",
                    "error": safety_results.get("error", "Safety validation failed")
                }
                
            # Step 4: Start monitoring
            logger.info("Starting monitoring system...")
            await self.monitoring_alerts.validate_alerts()
            
            # Record successful launch
            duration = (datetime.now() - start_time).total_seconds()
            self.record_keeper.record_validation_event(
                stage=ValidationStage.POST_VALIDATION,
                result={
                    "valid": True,
                    "message": "Beta launch completed successfully",
                    "duration": duration,
                    "stages": {
                        "pre_launch": pre_launch_result,
                        "runtime": runtime_result,
                        "safety": safety_results
                    }
                },
                timestamp=datetime.now()
            )
            
            logger.info(f"Beta launch completed successfully in {duration:.2f} seconds")
            return {
                "status": "success",
                "duration": duration,
                "stages": {
                    "pre_launch": pre_launch_result,
                    "runtime": runtime_result,
                    "safety": safety_results
                }
            }
            
        except Exception as e:
            logger.error(f"Beta launch failed: {str(e)}")
            return {
                "status": "failed",
                "stage": "unknown",
                "error": str(e)
            }

if __name__ == '__main__':
    # Initialize logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('logs/beta_launch.log')
        ]
    )
    
    # Create beta launch instance
    launcher = BetaLaunch()
    
    try:
        # Launch beta environment
        result = launcher.launch()
        print(result)
    except Exception as e:
        logger.error(f"Beta launch failed: {str(e)}")
