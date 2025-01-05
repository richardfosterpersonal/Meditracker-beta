"""
Validation Checkpoint Script
Critical Path: VALIDATION-CHECKPOINT-*
Last Updated: 2025-01-02T12:28:12+01:00

This script manages validation checkpoints and their associated data.
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
        logging.FileHandler('logs/validation_checkpoint.log')
    ]
)
logger = logging.getLogger(__name__)

class ValidationCheckpoint:
    """Validation Checkpoint Manager"""
    
    def __init__(self):
        """Initialize validation checkpoint manager"""
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
        
    async def create_checkpoint(self, name: str) -> Dict[str, Any]:
        """Create a new validation checkpoint"""
        try:
            logger.info(f"Creating validation checkpoint: {name}")
            
            # Run all validation stages
            results = {}
            for stage in ValidationStage:
                results[stage.name] = await self.beta_validator.validate_stage(stage)
                
            # Run safety validation
            safety_validator = MedicationSafetyValidator()
            safety_results = await safety_validator.validate_all()
            results["safety"] = safety_results
            
            # Calculate overall status
            is_valid = all(r.get("valid", False) for r in results.values())
            
            # Create checkpoint data
            checkpoint_data = {
                "name": name,
                "timestamp": datetime.now().isoformat(),
                "valid": is_valid,
                "stages": results
            }
            
            # Save checkpoint
            checkpoint_path = Path("checkpoints") / f"{name}.json"
            checkpoint_path.parent.mkdir(exist_ok=True)
            
            with open(checkpoint_path, "w") as f:
                json.dump(checkpoint_data, f, indent=2)
                
            logger.info(f"Checkpoint '{name}' created successfully")
            return checkpoint_data
            
        except Exception as e:
            logger.error(f"Failed to create checkpoint: {str(e)}")
            return {
                "name": name,
                "timestamp": datetime.now().isoformat(),
                "valid": False,
                "error": str(e)
            }
            
    async def compare_checkpoints(self, checkpoint1: str, checkpoint2: str) -> Dict[str, Any]:
        """Compare two validation checkpoints"""
        try:
            logger.info(f"Comparing checkpoints: {checkpoint1} vs {checkpoint2}")
            
            # Load checkpoints
            path1 = Path("checkpoints") / f"{checkpoint1}.json"
            path2 = Path("checkpoints") / f"{checkpoint2}.json"
            
            if not path1.exists() or not path2.exists():
                raise FileNotFoundError("One or both checkpoints not found")
                
            with open(path1) as f1, open(path2) as f2:
                data1 = json.load(f1)
                data2 = json.load(f2)
                
            # Compare validation results
            differences = {
                "added": [],
                "removed": [],
                "changed": []
            }
            
            # Compare stages
            stages1 = set(data1["stages"].keys())
            stages2 = set(data2["stages"].keys())
            
            differences["added"] = list(stages2 - stages1)
            differences["removed"] = list(stages1 - stages2)
            
            # Compare common stages
            for stage in stages1 & stages2:
                if data1["stages"][stage] != data2["stages"][stage]:
                    differences["changed"].append({
                        "stage": stage,
                        "from": data1["stages"][stage],
                        "to": data2["stages"][stage]
                    })
                    
            return {
                "checkpoint1": data1,
                "checkpoint2": data2,
                "differences": differences
            }
            
        except Exception as e:
            logger.error(f"Failed to compare checkpoints: {str(e)}")
            return {
                "error": str(e)
            }
            
def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Manage validation checkpoints")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Create checkpoint command
    create_parser = subparsers.add_parser("create", help="Create a new checkpoint")
    create_parser.add_argument("name", help="Name of the checkpoint")
    
    # Compare checkpoints command
    compare_parser = subparsers.add_parser("compare", help="Compare two checkpoints")
    compare_parser.add_argument("checkpoint1", help="First checkpoint name")
    compare_parser.add_argument("checkpoint2", help="Second checkpoint name")
    
    return parser.parse_args()

async def main():
    """Main entry point"""
    try:
        args = parse_args()
        checkpoint = ValidationCheckpoint()
        
        if args.command == "create":
            result = await checkpoint.create_checkpoint(args.name)
            if result.get("error"):
                logger.error(f"Failed to create checkpoint: {result['error']}")
                return 1
            logger.info(f"Checkpoint '{args.name}' created successfully")
            
        elif args.command == "compare":
            result = await checkpoint.compare_checkpoints(args.checkpoint1, args.checkpoint2)
            if result.get("error"):
                logger.error(f"Failed to compare checkpoints: {result['error']}")
                return 1
                
            # Print comparison results
            print("\nCheckpoint Comparison:")
            print(f"Added stages: {result['differences']['added']}")
            print(f"Removed stages: {result['differences']['removed']}")
            print("\nChanged stages:")
            for change in result['differences']['changed']:
                print(f"- {change['stage']}:")
                print(f"  From: {change['from']}")
                print(f"  To: {change['to']}")
                
        return 0
        
    except Exception as e:
        logger.error(f"Command failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
