"""
Beta Test Setup Script
Critical Path: BETA-TEST-SETUP-*
Last Updated: 2025-01-02T12:30:17+01:00

This script manages the setup and validation of beta test environments.
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
from backend.app.core.feature_flags import FeatureFlags
from backend.app.core.beta_onboarding import BetaOnboarding
from backend.app.core.beta_metrics import BetaMetrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/beta_test_setup.log')
    ]
)
logger = logging.getLogger(__name__)

class BetaTestSetup:
    """Manages beta test environment setup and validation"""
    
    def __init__(self, project_root: str):
        """Initialize beta test setup manager"""
        self.project_root = Path(project_root)
        self.beta_dir = self.project_root / 'beta'
        self.beta_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize validation components
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
        
        # Initialize beta systems
        self.feature_flags = FeatureFlags(self.project_root)
        self.onboarding = BetaOnboarding(self.project_root)
        self.metrics = BetaMetrics(self.project_root)
        
    async def setup_beta_environment(self) -> Dict[str, Any]:
        """Set up and validate beta testing environment"""
        start_time = datetime.now()
        results = {}
        
        try:
            # Step 1: Pre-setup validation
            logger.info("Running pre-setup validation...")
            pre_setup_result = await self.beta_validator.validate_stage(ValidationStage.PRE_VALIDATION)
            results["pre_setup"] = pre_setup_result
            
            if not pre_setup_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "pre_setup",
                    "error": pre_setup_result.get("message", "Pre-setup validation failed")
                }
                
            # Step 2: Configure feature flags
            logger.info("Configuring feature flags...")
            feature_flags_result = await self.feature_flags.configure_beta_flags()
            results["feature_flags"] = feature_flags_result
            
            if not feature_flags_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "feature_flags",
                    "error": feature_flags_result.get("message", "Feature flags configuration failed")
                }
                
            # Step 3: Setup onboarding
            logger.info("Setting up beta onboarding...")
            onboarding_result = await self.onboarding.setup_beta_onboarding()
            results["onboarding"] = onboarding_result
            
            if not onboarding_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "onboarding",
                    "error": onboarding_result.get("message", "Onboarding setup failed")
                }
                
            # Step 4: Configure metrics
            logger.info("Configuring beta metrics...")
            metrics_result = await self.metrics.configure_beta_metrics()
            results["metrics"] = metrics_result
            
            if not metrics_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "metrics",
                    "error": metrics_result.get("message", "Metrics configuration failed")
                }
                
            # Step 5: Post-setup validation
            logger.info("Running post-setup validation...")
            post_setup_result = await self.beta_validator.validate_stage(ValidationStage.POST_VALIDATION)
            results["post_setup"] = post_setup_result
            
            if not post_setup_result["valid"]:
                return {
                    "status": "failed",
                    "stage": "post_setup",
                    "error": post_setup_result.get("message", "Post-setup validation failed")
                }
                
            # Generate and save setup report
            duration = (datetime.now() - start_time).total_seconds()
            report = await self._generate_beta_report(results)
            
            return {
                "status": "success",
                "duration": duration,
                "report": report,
                "stages": results
            }
            
        except Exception as e:
            logger.error(f"Beta test setup failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "stages": results
            }
            
    async def _generate_beta_report(self, results: Dict) -> Dict[str, Any]:
        """Generate detailed beta readiness report"""
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "project_root": str(self.project_root),
                "beta_dir": str(self.beta_dir),
                "stages": results,
                "metrics": await self.metrics_collector.get_all_metrics(),
                "evidence": await self.evidence_collector.get_all_evidence(),
                "critical_paths": await self.critical_path_analyzer.get_critical_paths()
            }
            
            # Save report
            report_path = self.beta_dir / "reports" / f"beta_setup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            report_path.parent.mkdir(exist_ok=True)
            
            with open(report_path, "w") as f:
                json.dump(report, f, indent=2)
                
            logger.info(f"Beta setup report saved to: {report_path}")
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate beta report: {str(e)}")
            return {
                "error": str(e)
            }
            
def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Set up beta test environment")
    parser.add_argument(
        "--project-root",
        type=str,
        default=str(Path.cwd().parent),
        help="Project root directory"
    )
    return parser.parse_args()

async def main():
    """Main entry point"""
    try:
        args = parse_args()
        setup = BetaTestSetup(args.project_root)
        
        result = await setup.setup_beta_environment()
        if result["status"] == "success":
            logger.info("Beta test environment setup completed successfully")
            return 0
        else:
            logger.error(f"Beta test environment setup failed: {result.get('error', 'Unknown error')}")
            return 1
            
    except Exception as e:
        logger.error(f"Beta test setup failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
