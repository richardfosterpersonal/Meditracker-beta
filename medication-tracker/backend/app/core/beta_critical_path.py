"""
Beta Critical Path
Defines and manages beta testing critical path
Last Updated: 2024-12-30T23:08:51+01:00
"""

from typing import Dict
from datetime import datetime
import logging
from enum import Enum

from .beta_settings import BetaSettings

class BetaPhaseStatus(Enum):
    """Beta phase status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"

class BetaCriticalPath:
    """
    Defines and manages beta testing critical path
    Ensures proper progression through beta phases
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        
    async def get_critical_path(self) -> Dict:
        """Get critical path definition"""
        try:
            path = {}
            
            # Build critical path for each phase
            for phase, config in self.settings.BETA_PHASES.items():
                path[phase] = {
                    "name": config["name"],
                    "description": config["description"],
                    "duration_weeks": config["duration_weeks"],
                    "required_validations": config["required_validations"],
                    "validation_rules": config["validation_rules"],
                    "status": BetaPhaseStatus.PENDING.value
                }
                
            return {
                "success": True,
                "path": path,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get critical path: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get critical path",
                "details": str(e)
            }
            
    async def validate_critical_path(self) -> Dict:
        """Validate critical path configuration"""
        try:
            issues = []
            
            # Get critical path
            path = await self.get_critical_path()
            if not path["success"]:
                return path
                
            # Validate phase sequence
            phases = list(path["path"].keys())
            if phases != ["internal", "limited", "open"]:
                issues.append("Invalid phase sequence")
                
            # Validate phase configurations
            for phase, config in path["path"].items():
                # Check required fields
                required_fields = [
                    "name", "description", "duration_weeks",
                    "required_validations", "validation_rules"
                ]
                missing_fields = [
                    field for field in required_fields
                    if field not in config
                ]
                if missing_fields:
                    issues.append(
                        f"Phase {phase} missing fields: {', '.join(missing_fields)}"
                    )
                    
                # Check validation rules
                if not config["validation_rules"]:
                    issues.append(f"Phase {phase} has no validation rules")
                    
                # Check duration
                if config["duration_weeks"] <= 0:
                    issues.append(f"Phase {phase} has invalid duration")
                    
            return {
                "success": len(issues) == 0,
                "issues": issues,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate critical path: {str(e)}")
            return {
                "success": False,
                "error": "Failed to validate critical path",
                "details": str(e)
            }
            
    async def get_phase_requirements(self, phase: str) -> Dict:
        """Get requirements for a specific phase"""
        try:
            # Validate phase
            if phase not in self.settings.BETA_PHASES:
                return {
                    "success": False,
                    "error": f"Invalid phase: {phase}"
                }
            
            # Get phase configuration
            config = self.settings.get_phase_config(phase)
            
            # Get validation rules
            rules = {}
            for component in config["required_validations"]:
                rules[component] = config["validation_rules"][component]
                
            return {
                "success": True,
                "phase": phase,
                "requirements": {
                    "validations": config["required_validations"],
                    "rules": rules,
                    "duration_weeks": config["duration_weeks"]
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase requirements: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get phase requirements",
                "details": str(e)
            }
            
    async def validate_phase_sequence(
        self,
        current_phase: str,
        next_phase: str
    ) -> Dict:
        """Validate phase transition sequence"""
        try:
            phases = list(self.settings.BETA_PHASES.keys())
            
            # Check if phases exist
            if current_phase not in phases or next_phase not in phases:
                return {
                    "success": False,
                    "error": "Invalid phase"
                }
                
            # Check sequence
            current_index = phases.index(current_phase)
            next_index = phases.index(next_phase)
            
            if next_index != current_index + 1:
                return {
                    "success": False,
                    "error": "Invalid phase sequence"
                }
                
            return {
                "success": True,
                "current_phase": current_phase,
                "next_phase": next_phase,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate phase sequence: {str(e)}")
            return {
                "success": False,
                "error": "Failed to validate phase sequence",
                "details": str(e)
            }
            
    async def get_phase_status(self, phase: str) -> Dict:
        """Get current status of a phase"""
        try:
            # Validate phase
            if phase not in self.settings.BETA_PHASES:
                return {
                    "success": False,
                    "error": f"Invalid phase: {phase}"
                }
                
            # Get critical path
            path = await self.get_critical_path()
            if not path["success"]:
                return path
                
            phase_info = path["path"][phase]
            
            return {
                "success": True,
                "phase": phase,
                "status": phase_info["status"],
                "name": phase_info["name"],
                "description": phase_info["description"],
                "duration_weeks": phase_info["duration_weeks"],
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase status: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get phase status",
                "details": str(e)
            }
