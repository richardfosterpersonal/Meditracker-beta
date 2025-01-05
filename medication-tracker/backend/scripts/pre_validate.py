#!/usr/bin/env python
"""
Pre-validation script for beta launch
Last Updated: 2025-01-02T11:07:02+01:00
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, project_root)

from backend.app.core.validation_hooks import ValidationHooks, ValidationStage
from backend.app.core.beta_validation import BetaValidationRunner
from backend.app.core.validation_records import ValidationRecordKeeper
from backend.app.core.path_validator import PathValidator
from backend.app.core.beta_critical_path_analyzer import BetaCriticalPathAnalyzer
from backend.app.core.monitoring_alerts import MonitoringAlerts
from backend.app.core.metrics_collector import MetricsCollector
from backend.app.core.evidence_collector import EvidenceCollector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def main():
    """Run pre-validation checks"""
    try:
        logger.info("Starting pre-validation process...")
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
        beta_validator = BetaValidationRunner(
            validation_hooks=validation_hooks,
            record_keeper=record_keeper,
            path_validator=path_validator,
            critical_path_analyzer=critical_path_analyzer,
            monitoring_alerts=monitoring_alerts
        )

        # Run pre-validation stage
        logger.info("Running pre-validation stage...")
        result = beta_validator.validate_stage(ValidationStage.PRE_VALIDATION)
        if not result["valid"]:
            logger.error("Pre-validation failed:")
            for error in result.get("errors", []):
                logger.error(f"- {error}")
            sys.exit(1)

        # Record validation results
        record_keeper.record_validation_event(
            stage=ValidationStage.PRE_VALIDATION,
            result=result,
            timestamp=datetime.now()
        )

        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"Pre-validation completed successfully in {duration:.2f} seconds")
        return 0

    except Exception as e:
        logger.error(f"Pre-validation failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
