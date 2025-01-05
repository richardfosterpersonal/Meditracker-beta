"""
Critical Path Validator
Validates critical path operations and transitions
Last Updated: 2024-12-30T23:08:51+01:00
"""

from typing import Dict, Optional
from datetime import datetime
import logging
from pathlib import Path

from .beta_settings import BetaSettings

class CriticalPathValidator:
    """
    Validates critical path operations and transitions
    Ensures proper validation of each step in the critical path
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        
    async def start_validation(
        self,
        operation: str,
        priority: str
    ) -> str:
        """Start validation chain for an operation"""
        try:
            # Generate validation ID
            validation_id = f"VALIDATION-{operation}-{datetime.utcnow().timestamp()}"
            
            # Record validation start
            validation_dir = self.settings.BETA_BASE_PATH / "validations"
            validation_dir.mkdir(parents=True, exist_ok=True)
            
            validation_file = validation_dir / f"{validation_id}.txt"
            with open(validation_file, "w") as f:
                f.write(f"Operation: {operation}\n")
                f.write(f"Priority: {priority}\n")
                f.write(f"Start Time: {datetime.utcnow().isoformat()}\n")
                f.write("Status: started\n")
                
            return validation_id
            
        except Exception as e:
            self.logger.error(f"Failed to start validation: {str(e)}")
            raise
            
    async def complete_validation(
        self,
        validation_id: str,
        status: str
    ) -> None:
        """Complete validation chain"""
        try:
            # Update validation status
            validation_file = (
                self.settings.BETA_BASE_PATH
                / "validations"
                / f"{validation_id}.txt"
            )
            
            if not validation_file.exists():
                raise ValueError(f"Invalid validation ID: {validation_id}")
                
            # Read existing content
            with open(validation_file, "r") as f:
                lines = f.readlines()
                
            # Update status and add completion time
            with open(validation_file, "w") as f:
                for line in lines:
                    if not line.startswith("Status:"):
                        f.write(line)
                f.write(f"Status: {status}\n")
                f.write(f"End Time: {datetime.utcnow().isoformat()}\n")
                
        except Exception as e:
            self.logger.error(f"Failed to complete validation: {str(e)}")
            raise
            
    async def get_validation_status(self, validation_id: str) -> Dict:
        """Get validation status"""
        try:
            validation_file = (
                self.settings.BETA_BASE_PATH
                / "validations"
                / f"{validation_id}.txt"
            )
            
            if not validation_file.exists():
                return {
                    "success": False,
                    "error": f"Invalid validation ID: {validation_id}"
                }
                
            # Parse validation file
            status = {}
            with open(validation_file, "r") as f:
                for line in f:
                    key, value = line.strip().split(": ", 1)
                    status[key.lower()] = value
                    
            return {
                "success": True,
                "validation_id": validation_id,
                "status": status
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get validation status: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get validation status",
                "details": str(e)
            }
            
    async def validate_critical_path(
        self,
        phase_id: str,
        component: str
    ) -> Dict:
        """Validate critical path for a component"""
        try:
            # Get phase configuration
            settings = BetaSettings()
            phase_config = settings.get_phase_config(phase_id)
            
            if component not in phase_config["critical_path"]:
                return {
                    "success": False,
                    "error": f"Invalid component: {component}"
                }
                
            path = phase_config["critical_path"][component]
            
            # Check path requirements
            issues = []
            
            # Check dependencies
            for dependency in path["dependencies"]:
                status = await self.get_validation_status(dependency)
                if not status["success"]:
                    issues.append(
                        f"Failed to validate dependency: {dependency}"
                    )
                    continue
                    
                if status["status"]["status"] != "completed":
                    issues.append(
                        f"Dependency not completed: {dependency}"
                    )
                    
            # Check validation rules
            for rule in path["validation_rules"]:
                rule_status = await self.validate_rule(
                    phase_id,
                    component,
                    rule
                )
                if not rule_status["success"]:
                    issues.append(rule_status["error"])
                    
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
            
    async def validate_rule(
        self,
        phase_id: str,
        component: str,
        rule: Dict
    ) -> Dict:
        """Validate a specific rule"""
        try:
            # Get rule type
            rule_type = rule.get("type")
            if not rule_type:
                return {
                    "success": False,
                    "error": "Missing rule type"
                }
                
            # Validate based on rule type
            if rule_type == "metric":
                return await self._validate_metric_rule(
                    phase_id,
                    component,
                    rule
                )
            elif rule_type == "evidence":
                return await self._validate_evidence_rule(
                    phase_id,
                    component,
                    rule
                )
            else:
                return {
                    "success": False,
                    "error": f"Invalid rule type: {rule_type}"
                }
                
        except Exception as e:
            self.logger.error(f"Failed to validate rule: {str(e)}")
            return {
                "success": False,
                "error": "Failed to validate rule",
                "details": str(e)
            }
            
    async def _validate_metric_rule(
        self,
        phase_id: str,
        component: str,
        rule: Dict
    ) -> Dict:
        """Validate a metric-based rule"""
        try:
            metric = rule.get("metric")
            threshold = rule.get("threshold")
            
            if not metric or threshold is None:
                return {
                    "success": False,
                    "error": "Invalid metric rule configuration"
                }
                
            # Get metric value
            metric_value = await self.get_metric_value(
                phase_id,
                component,
                metric
            )
            
            if not metric_value["success"]:
                return metric_value
                
            # Check threshold
            if metric_value["value"] < threshold:
                return {
                    "success": False,
                    "error": (
                        f"Metric {metric} below threshold: "
                        f"{metric_value['value']} < {threshold}"
                    )
                }
                
            return {
                "success": True,
                "metric": metric,
                "value": metric_value["value"],
                "threshold": threshold
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate metric rule: {str(e)}")
            return {
                "success": False,
                "error": "Failed to validate metric rule",
                "details": str(e)
            }
            
    async def _validate_evidence_rule(
        self,
        phase_id: str,
        component: str,
        rule: Dict
    ) -> Dict:
        """Validate an evidence-based rule"""
        try:
            evidence_type = rule.get("evidence_type")
            required = rule.get("required", True)
            
            if not evidence_type:
                return {
                    "success": False,
                    "error": "Invalid evidence rule configuration"
                }
                
            # Check evidence directory
            evidence_dir = (
                self.settings.BETA_EVIDENCE_PATH
                / phase_id
                / component
            )
            
            if not evidence_dir.exists():
                if required:
                    return {
                        "success": False,
                        "error": f"Missing evidence directory: {evidence_dir}"
                    }
                return {"success": True}
                
            # Check for evidence files
            evidence_files = list(evidence_dir.glob(f"*.{evidence_type}"))
            
            if not evidence_files and required:
                return {
                    "success": False,
                    "error": f"Missing {evidence_type} evidence"
                }
                
            return {
                "success": True,
                "evidence_type": evidence_type,
                "files": [str(f) for f in evidence_files]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate evidence rule: {str(e)}")
            return {
                "success": False,
                "error": "Failed to validate evidence rule",
                "details": str(e)
            }
