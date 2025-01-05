"""
Validation Check Runner
Last Updated: 2025-01-02T13:02:48+01:00
"""

import logging
import sys
from pathlib import Path
from typing import Dict, Any

from backend.app.core.pre_validation_requirements import PreValidationManager
from backend.app.core.preflight import PreflightValidator
from backend.app.core.beta_validation_orchestrator import BetaValidationOrchestrator
from backend.app.core.validation_recovery import ValidationRecoveryHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_validation_checks():
    """Run all validation checks and report status"""
    try:
        project_root = Path(__file__).parent.parent.parent.parent
        
        # Step 1: Run pre-validation checks
        logger.info("Running pre-validation checks...")
        pre_validator = PreValidationManager()
        try:
            pre_validator.validate_all()
            logger.info("✓ Pre-validation checks passed")
        except Exception as e:
            logger.error(f"✗ Pre-validation failed: {str(e)}")
            recovery = ValidationRecoveryHandler(project_root)
            plan = recovery.get_recovery_plan({"status": "FAILED", "details": {"issues": [str(e)]}})
            if plan:
                logger.info("Recovery steps:")
                for step in plan:
                    logger.info(f"- {step.description}")
            return False
            
        # Step 2: Run preflight checks
        logger.info("\nRunning preflight checks...")
        preflight = PreflightValidator(project_root)
        results = preflight.run_all_validations()
        if not all(r.success for r in results):
            logger.error("✗ Preflight checks failed:")
            for result in results:
                if not result.success:
                    logger.error(f"- {result.message}")
                    if result.details:
                        for issue in result.details.get('issues', []):
                            logger.error(f"  * {issue}")
            return False
        logger.info("✓ Preflight checks passed")
        
        # Step 3: Run beta validation checks
        logger.info("\nRunning beta validation checks...")
        beta_validator = BetaValidationOrchestrator()
        beta_result = beta_validator.validate_beta_readiness()
        if not beta_result.get("valid", False):
            logger.error("✗ Beta validation failed:")
            logger.error(f"- {beta_result.get('error', 'Unknown error')}")
            if "details" in beta_result:
                logger.error(f"  Details: {beta_result['details']}")
            return False
        logger.info("✓ Beta validation checks passed")
        
        logger.info("\n✓ All validation checks completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Validation check runner failed: {str(e)}")
        return False

if __name__ == "__main__":
    sys.exit(0 if run_validation_checks() else 1)
