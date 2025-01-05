"""
Beta Launch Manager
Critical Path: BETA-LAUNCH-*
Last Updated: 2025-01-02T10:51:00+01:00

Manages the beta launch process with validation hooks.
"""

import logging
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

from .launch_plan_validator import LaunchPlanValidator
from .beta_requirements_validator import BetaRequirementsValidator
from .beta_validation_orchestrator import BetaValidationOrchestrator
from .validation_hooks import ValidationHooks, ValidationStage, ValidationHookPriority, ValidationHookType
from ..exceptions import BetaLaunchError

logger = logging.getLogger(__name__)

class BetaLaunchManager:
    """Manages the beta launch process with validation hooks"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.launch_state: Dict[str, Any] = {
            "status": "pending",
            "launch_time": None,
            "validation_state": None,
            "errors": []
        }
        
        # Initialize validators
        self.launch_validator = LaunchPlanValidator(self.project_root)
        self.requirements_validator = BetaRequirementsValidator()
        self.validation_orchestrator = BetaValidationOrchestrator()
        self.hooks = ValidationHooks.get_instance()
        
    async def validate_launch_plan(self) -> Dict[str, Any]:
        """Validate the entire launch plan"""
        logger.info("Validating launch plan...")
        results = self.launch_validator.validate_launch_plan()
        
        if not results["valid"]:
            self.launch_state["status"] = "failed"
            self.launch_state["errors"].extend(results["errors"])
            raise BetaLaunchError("Launch plan validation failed")
            
        logger.info("Launch plan validation successful")
        return results
        
    async def validate_requirements(self) -> Dict[str, Any]:
        """Validate beta requirements"""
        logger.info("Validating beta requirements...")
        results = await self.requirements_validator.validate_core_functionality({})
        
        if not results["valid"]:
            self.launch_state["status"] = "failed"
            self.launch_state["errors"].extend(results["errors"])
            raise BetaLaunchError("Beta requirements validation failed")
            
        logger.info("Beta requirements validation successful")
        return results
        
    async def run_validation_hooks(self) -> Dict[str, Any]:
        """Run all validation hooks"""
        logger.info("Running validation hooks...")
        
        # Run hooks in order of stages
        stages = [
            ValidationStage.PROCESS,
            ValidationStage.BOOTSTRAP,
            ValidationStage.PRE_VALIDATION,
            ValidationStage.VALIDATION,
            ValidationStage.POST_VALIDATION,
            ValidationStage.CLEANUP
        ]
        
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "stages": {}
        }
        
        for stage in stages:
            try:
                stage_results = self.hooks.validate_stage(stage)
                results["stages"][stage.value] = stage_results
                
                if not stage_results["valid"]:
                    results["valid"] = False
                    results["errors"].extend(stage_results["errors"])
                    results["warnings"].extend(stage_results["warnings"])
                    
            except Exception as e:
                logger.error(f"Stage {stage.value} validation failed: {str(e)}")
                results["valid"] = False
                results["errors"].append(f"Stage {stage.value} validation failed: {str(e)}")
                
        if not results["valid"]:
            self.launch_state["status"] = "failed"
            self.launch_state["errors"].extend(results["errors"])
            raise BetaLaunchError("Validation hooks failed")
            
        logger.info("Validation hooks completed successfully")
        return results
        
    async def orchestrate_launch(self) -> Dict[str, Any]:
        """Orchestrate the beta launch process"""
        logger.info("Starting beta launch orchestration...")
        
        try:
            # Run validations
            await self.validate_launch_plan()
            await self.validate_requirements()
            await self.run_validation_hooks()
            
            # Update launch state
            self.launch_state["status"] = "success"
            self.launch_state["launch_time"] = datetime.utcnow()
            self.launch_state["validation_state"] = self.hooks.get_validation_state()
            
            logger.info("Beta launch orchestration completed successfully")
            return self.launch_state
            
        except Exception as e:
            logger.error(f"Beta launch orchestration failed: {str(e)}")
            self.launch_state["status"] = "failed"
            self.launch_state["errors"].append(str(e))
            raise BetaLaunchError(f"Launch orchestration failed: {str(e)}")
            
    def get_launch_state(self) -> Dict[str, Any]:
        """Get current launch state"""
        return self.launch_state
        
    def reset_launch_state(self) -> None:
        """Reset launch state"""
        self.launch_state = {
            "status": "pending",
            "launch_time": None,
            "validation_state": None,
            "errors": []
        }
        self.hooks.reset()
