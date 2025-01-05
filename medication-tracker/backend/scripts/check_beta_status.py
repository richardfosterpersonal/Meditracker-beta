"""
Beta Status Check Script
Critical Path: BETA-STATUS-CHECK-*
Last Updated: 2025-01-02T12:30:17+01:00

This script checks the current status of the beta environment.
"""

import argparse
import asyncio
import json
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
        logging.FileHandler('logs/beta_status.log')
    ]
)
logger = logging.getLogger(__name__)

class BetaStatusChecker:
    """Beta Status Checker"""
    
    def __init__(self):
        """Initialize beta status checker"""
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
        
    async def check_status(self) -> Dict[str, Any]:
        """Check beta environment status"""
        start_time = datetime.now()
        results = {}
        
        try:
            # Step 1: Run validation checks
            for stage in ValidationStage:
                logger.info(f"Running {stage.name} validation...")
                results[stage.name] = await self.beta_validator.validate_stage(stage)
                
            # Step 2: Run safety check
            logger.info("Running safety validation...")
            safety_validator = MedicationSafetyValidator()
            safety_results = await safety_validator.validate_all()
            results["safety"] = safety_results
            
            # Step 3: Get monitoring status
            logger.info("Getting monitoring status...")
            monitoring_status = await self.monitoring_alerts.get_status()
            results["monitoring"] = monitoring_status
            
            # Step 4: Get metrics
            logger.info("Collecting metrics...")
            metrics = await self.metrics_collector.get_all_metrics()
            results["metrics"] = metrics
            
            # Step 5: Get critical paths
            logger.info("Analyzing critical paths...")
            critical_paths = await self.critical_path_analyzer.get_critical_paths()
            results["critical_paths"] = critical_paths
            
            # Calculate overall status
            is_valid = all(r.get("valid", False) for r in results.values())
            duration = (datetime.now() - start_time).total_seconds()
            
            # Record status check
            self.record_keeper.record_validation_event(
                stage=ValidationStage.POST_VALIDATION,
                result={
                    "valid": is_valid,
                    "message": "Beta status check completed",
                    "duration": duration,
                    "stages": results
                },
                timestamp=datetime.now()
            )
            
            return {
                "status": "healthy" if is_valid else "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "duration": duration,
                "components": results
            }
            
        except Exception as e:
            logger.error(f"Beta status check failed: {str(e)}")
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "components": results
            }
            
    async def generate_report(self, status: Dict[str, Any]) -> str:
        """Generate detailed status report"""
        try:
            # Create report directory
            report_dir = Path("reports/beta_status")
            report_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate report file name
            report_path = report_dir / f"status_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            # Add additional context to report
            report_data = {
                "status": status,
                "evidence": await self.evidence_collector.get_all_evidence(),
                "alerts": await self.monitoring_alerts.get_active_alerts(),
                "validation_history": self.record_keeper.get_recent_validations()
            }
            
            # Save report
            with open(report_path, "w") as f:
                json.dump(report_data, f, indent=2)
                
            logger.info(f"Status report saved to: {report_path}")
            return str(report_path)
            
        except Exception as e:
            logger.error(f"Failed to generate status report: {str(e)}")
            return ""
            
def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Check beta environment status")
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate detailed status report"
    )
    return parser.parse_args()

async def main():
    """Main entry point"""
    try:
        args = parse_args()
        checker = BetaStatusChecker()
        
        # Check status
        status = await checker.check_status()
        
        # Print status summary
        print(f"\nBeta Status: {status['status']}")
        print(f"Timestamp: {status['timestamp']}")
        print(f"Duration: {status['duration']:.2f} seconds")
        
        if status["status"] == "error":
            print(f"Error: {status.get('error', 'Unknown error')}")
            return 1
            
        # Generate report if requested
        if args.report:
            report_path = await checker.generate_report(status)
            if report_path:
                print(f"\nDetailed report saved to: {report_path}")
                
        return 0 if status["status"] == "healthy" else 1
        
    except Exception as e:
        logger.error(f"Beta status check failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
