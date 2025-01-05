"""
Critical Path Validation Script
Validates all critical paths and dependencies in the codebase
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Set up environment
os.environ["ENV_FILE"] = str(Path(__file__).parent.parent / "backend" / ".env.validation")

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.app.core.config import settings
from backend.app.core.logging import beta_logger
from backend.app.validation.validation_orchestrator import ValidationOrchestrator
from backend.app.validation.beta_validation_tracker import BetaValidationTracker

class CriticalPathValidator:
    """Validates critical paths in the codebase"""
    
    def __init__(self):
        self.config_file = project_root / ".validation-config.json"
        self.config = self._load_config()
        self.orchestrator = ValidationOrchestrator()
        self.beta_tracker = BetaValidationTracker()
        self.logger = beta_logger
    
    def _load_config(self) -> Dict:
        """Loads validation configuration"""
        with open(self.config_file, 'r') as f:
            return json.load(f)
    
    def _save_config(self):
        """Saves updated validation configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    async def validate_dependencies(self) -> bool:
        """Validates all required dependencies"""
        self.logger.info("Validating dependencies...")
        
        missing_files = []
        for required_file in self.config["dependencies"]["requiredFiles"]:
            file_path = project_root / required_file
            if not file_path.exists():
                missing_files.append(required_file)
        
        if missing_files:
            self.logger.error(f"Missing required files: {missing_files}")
            return False
        
        return True
    
    async def validate_critical_paths(self) -> Dict[str, bool]:
        """Validates all critical paths"""
        results = {}
        
        for path in self.config["criticalPaths"]:
            self.logger.info(f"Validating critical path: {path}")
            try:
                full_path = project_root / path
                if not full_path.exists():
                    results[path] = False
                    self.logger.error(f"Critical path does not exist: {path}")
                    continue
                
                # Validate path contents
                state = await self.orchestrator.validate_critical_path(str(full_path))
                results[path] = state["validation_status"]
                
            except Exception as e:
                self.logger.error(f"Error validating {path}: {str(e)}")
                results[path] = False
        
        return results
    
    async def validate_beta_components(self) -> Dict[str, bool]:
        """Validates all beta components"""
        results = {}
        
        for component in self.config["betaValidation"]["components"]:
            self.logger.info(f"Validating beta component: {component}")
            try:
                state = await self.orchestrator.validate_beta_component(component)
                results[component] = state["validation_status"]
            except Exception as e:
                self.logger.error(f"Error validating {component}: {str(e)}")
                results[component] = False
        
        return results
    
    def generate_report(self, results: Dict) -> str:
        """Generates validation report"""
        report = []
        report.append("=== Critical Path Validation Report ===")
        report.append(f"Generated: {datetime.now().isoformat()}\n")
        
        # Dependencies
        report.append("Dependencies:")
        report.append(f"Status: {'✓' if results['dependencies'] else '✗'}\n")
        
        # Critical Paths
        report.append("Critical Paths:")
        for path, status in results["critical_paths"].items():
            report.append(f"- {path}: {'✓' if status else '✗'}")
        report.append("")
        
        # Beta Components
        report.append("Beta Components:")
        for component, status in results["beta_components"].items():
            report.append(f"- {component}: {'✓' if status else '✗'}")
        
        return "\n".join(report)
    
    async def run_validation(self):
        """Runs complete validation"""
        self.logger.info("Starting comprehensive validation...")
        
        results = {
            "dependencies": await self.validate_dependencies(),
            "critical_paths": await self.validate_critical_paths(),
            "beta_components": await self.validate_beta_components()
        }
        
        # Update config with latest validation time
        self.config["lastValidated"] = datetime.now().isoformat()
        self._save_config()
        
        # Generate and log report
        report = self.generate_report(results)
        self.logger.info("\n" + report)
        
        # Determine overall status
        is_valid = (
            results["dependencies"] and
            all(results["critical_paths"].values()) and
            all(results["beta_components"].values())
        )
        
        return is_valid

async def main():
    """Main entry point"""
    validator = CriticalPathValidator()
    is_valid = await validator.run_validation()
    
    if not is_valid:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
