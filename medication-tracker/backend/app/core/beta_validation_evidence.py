"""
Beta Validation Evidence Collector
Collects and maintains validation evidence for beta testing
Last Updated: 2024-12-31T15:58:30+01:00
"""

from typing import Dict, List, Any
from datetime import datetime
import json
import os
from pathlib import Path
import asyncio
import logging
from collections import defaultdict

from .beta_settings import BetaSettings
from .validation_hook import ValidationHook
from .validation_metrics import MetricsCollector, MetricContext, MetricType, ValidationLevel, ValidationStatus

class BetaValidationEvidence:
    """Manages evidence collection and validation for beta testing"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        self._evidence_dir = Path(self.settings.BETA_EVIDENCE_PATH)
        self._evidence_lock = asyncio.Lock()
        self._initialize_evidence_store()
    
    def _initialize_evidence_store(self):
        """Initialize evidence storage directory"""
        self._evidence_dir.mkdir(parents=True, exist_ok=True)
        
    async def collect_evidence(self, phase: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Collect and validate evidence for a phase"""
        async with self._evidence_lock:
            try:
                # Get phase requirements
                phase_config = self.settings.BETA_PHASES[phase]
                required_evidence = phase_config["required_validations"]
                
                # Initialize evidence collection
                evidence = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "phase": phase,
                    "collected_by": "system",
                    "data": {}
                }
                
                # Collect and validate each piece of evidence
                for req in required_evidence:
                    if req not in data:
                        raise ValidationError(f"Missing required evidence: {req}")
                        
                    # Validate evidence data
                    validation_result = await self._validate_evidence(req, data[req])
                    evidence["data"][req] = {
                        "value": data[req],
                        "valid": validation_result["valid"],
                        "validation": validation_result
                    }
                
                # Store evidence
                await self._store_evidence(phase, evidence)
                
                return evidence["data"]
                
            except Exception as e:
                self.logger.error(f"Error collecting evidence for {phase}: {str(e)}")
                raise ValidationError(f"Evidence collection failed: {str(e)}")
    
    async def _validate_evidence(self, requirement: str, data: Any) -> Dict[str, Any]:
        """Validate a piece of evidence"""
        try:
            # Get validation rules for requirement
            rules = self._get_validation_rules(requirement)
            
            # Initialize validation result
            result = {
                "valid": True,
                "errors": [],
                "warnings": []
            }
            
            # Apply validation rules
            for rule in rules:
                rule_result = await self._apply_validation_rule(rule, data)
                if not rule_result["valid"]:
                    result["valid"] = False
                    result["errors"].extend(rule_result["errors"])
                result["warnings"].extend(rule_result.get("warnings", []))
            
            return result
            
        except Exception as e:
            return {
                "valid": False,
                "errors": [str(e)],
                "warnings": []
            }
    
    def _get_validation_rules(self, requirement: str) -> List[Dict]:
        """Get validation rules for a requirement"""
        # Define validation rules for different requirements
        rules = {
            "core_functionality": [
                {"type": "required_fields", "fields": ["feature_tests", "performance_metrics"]},
                {"type": "success_rate", "min_rate": 0.95}
            ],
            "safety_checks": [
                {"type": "required_fields", "fields": ["security_audit", "vulnerability_scan"]},
                {"type": "compliance", "standard": "HIPAA"}
            ],
            "user_experience": [
                {"type": "required_fields", "fields": ["user_feedback", "interaction_metrics"]},
                {"type": "satisfaction_score", "min_score": 4.0}
            ]
        }
        return rules.get(requirement, [])
    
    async def _apply_validation_rule(self, rule: Dict, data: Any) -> Dict[str, Any]:
        """Apply a validation rule to evidence data"""
        try:
            rule_type = rule["type"]
            
            if rule_type == "required_fields":
                return self._validate_required_fields(rule["fields"], data)
            elif rule_type == "success_rate":
                return self._validate_success_rate(rule["min_rate"], data)
            elif rule_type == "compliance":
                return self._validate_compliance(rule["standard"], data)
            elif rule_type == "satisfaction_score":
                return self._validate_satisfaction_score(rule["min_score"], data)
            else:
                return {"valid": False, "errors": [f"Unknown validation rule type: {rule_type}"]}
                
        except Exception as e:
            return {"valid": False, "errors": [str(e)]}
    
    def _validate_required_fields(self, required_fields: List[str], data: Dict) -> Dict[str, Any]:
        """Validate required fields are present"""
        missing_fields = [f for f in required_fields if f not in data]
        return {
            "valid": len(missing_fields) == 0,
            "errors": [f"Missing required fields: {missing_fields}"] if missing_fields else []
        }
    
    def _validate_success_rate(self, min_rate: float, data: Dict) -> Dict[str, Any]:
        """Validate success rate meets minimum threshold"""
        try:
            success_rate = data.get("success_rate", 0)
            return {
                "valid": success_rate >= min_rate,
                "errors": [f"Success rate {success_rate} below minimum {min_rate}"] if success_rate < min_rate else []
            }
        except Exception:
            return {"valid": False, "errors": ["Invalid success rate data"]}
    
    def _validate_compliance(self, standard: str, data: Dict) -> Dict[str, Any]:
        """Validate compliance with a standard"""
        try:
            compliance_result = data.get("compliance_check", {})
            is_compliant = compliance_result.get("compliant", False)
            return {
                "valid": is_compliant,
                "errors": [f"Not compliant with {standard}"] if not is_compliant else [],
                "warnings": compliance_result.get("warnings", [])
            }
        except Exception:
            return {"valid": False, "errors": ["Invalid compliance data"]}
    
    def _validate_satisfaction_score(self, min_score: float, data: Dict) -> Dict[str, Any]:
        """Validate satisfaction score meets minimum threshold"""
        try:
            score = data.get("satisfaction_score", 0)
            return {
                "valid": score >= min_score,
                "errors": [f"Satisfaction score {score} below minimum {min_score}"] if score < min_score else []
            }
        except Exception:
            return {"valid": False, "errors": ["Invalid satisfaction score data"]}
    
    async def _store_evidence(self, phase: str, evidence: Dict):
        """Store collected evidence"""
        try:
            # Create phase directory if it doesn't exist
            phase_dir = self._evidence_dir / phase
            phase_dir.mkdir(exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"evidence_{timestamp}.json"
            
            # Write evidence to file
            evidence_file = phase_dir / filename
            with evidence_file.open("w") as f:
                json.dump(evidence, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error storing evidence: {str(e)}")
            raise ValidationError(f"Failed to store evidence: {str(e)}")

    async def get_phase_evidence(self, phase: str) -> Dict[str, Any]:
        """Get all evidence for a phase"""
        try:
            phase_dir = self._evidence_dir / phase
            if not phase_dir.exists():
                return {}

            evidence = {}
            for evidence_file in phase_dir.glob("evidence_*.json"):
                with evidence_file.open("r") as f:
                    data = json.load(f)
                    evidence_type = data.get("type", "unknown")
                    if evidence_type not in evidence:
                        evidence[evidence_type] = []
                    evidence[evidence_type].append(data)

            return evidence

        except Exception as e:
            self.logger.error(f"Error retrieving phase evidence: {str(e)}")
            return {}

    async def get_phase_data(self, phase: str) -> Dict[str, Any]:
        """Get phase metadata and metrics"""
        try:
            phase_dir = self._evidence_dir / phase
            if not phase_dir.exists():
                return {}

            metadata_file = phase_dir / "metadata.json"
            if not metadata_file.exists():
                return {}

            with metadata_file.open("r") as f:
                return json.load(f)

        except Exception as e:
            self.logger.error(f"Error retrieving phase data: {str(e)}")
            return {}

    async def update_phase_data(self, phase: str, data: Dict[str, Any]) -> None:
        """Update phase metadata"""
        try:
            phase_dir = self._evidence_dir / phase
            phase_dir.mkdir(parents=True, exist_ok=True)

            metadata_file = phase_dir / "metadata.json"
            
            # Load existing metadata
            existing_data = {}
            if metadata_file.exists():
                with metadata_file.open("r") as f:
                    existing_data = json.load(f)

            # Update metadata
            existing_data.update(data)
            
            # Write updated metadata
            with metadata_file.open("w") as f:
                json.dump(existing_data, f, indent=2)

        except Exception as e:
            self.logger.error(f"Error updating phase data: {str(e)}")
            raise

    async def store_evidence(self, phase: str, evidence_type: str, evidence_data: Dict[str, Any]) -> None:
        """Store evidence for a phase"""
        try:
            # Create phase directory
            phase_dir = self._evidence_dir / phase
            phase_dir.mkdir(parents=True, exist_ok=True)

            # Add metadata
            evidence_data.update({
                "type": evidence_type,
                "timestamp": datetime.utcnow().isoformat(),
                "phase": phase
            })

            # Generate filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"evidence_{evidence_type}_{timestamp}.json"

            # Write evidence
            evidence_file = phase_dir / filename
            with evidence_file.open("w") as f:
                json.dump(evidence_data, f, indent=2)

            # Update phase metadata
            await self.update_phase_metrics(phase, evidence_type, evidence_data)

        except Exception as e:
            self.logger.error(f"Error storing evidence: {str(e)}")
            raise

    async def update_phase_metrics(self, phase: str, evidence_type: str, evidence_data: Dict[str, Any]) -> None:
        """Update phase metrics based on new evidence"""
        try:
            metrics = {
                "last_update": datetime.utcnow().isoformat(),
                "evidence_count": await self._count_phase_evidence(phase),
                "validation_status": await self._calculate_validation_status(phase),
                "completion_percentage": await self._calculate_completion_percentage(phase)
            }

            # Add evidence-specific metrics
            if evidence_type == "core_functionality":
                metrics.update(await self._calculate_core_metrics(evidence_data))
            elif evidence_type == "user_experience":
                metrics.update(await self._calculate_ux_metrics(evidence_data))
            elif evidence_type == "security":
                metrics.update(await self._calculate_security_metrics(evidence_data))

            await self.update_phase_data(phase, {"metrics": metrics})

        except Exception as e:
            self.logger.error(f"Error updating phase metrics: {str(e)}")
            raise

    async def _count_phase_evidence(self, phase: str) -> int:
        """Count total evidence items for a phase"""
        try:
            phase_dir = self._evidence_dir / phase
            if not phase_dir.exists():
                return 0
            return len(list(phase_dir.glob("evidence_*.json")))
        except Exception:
            return 0

    async def _calculate_validation_status(self, phase: str) -> str:
        """Calculate overall validation status for a phase"""
        try:
            evidence = await self.get_phase_evidence(phase)
            if not evidence:
                return "NOT_STARTED"

            total_validations = 0
            passed_validations = 0

            for evidence_list in evidence.values():
                for item in evidence_list:
                    validation = item.get("validation", {})
                    if validation.get("valid"):
                        passed_validations += 1
                    total_validations += 1

            if total_validations == 0:
                return "IN_PROGRESS"
            elif passed_validations == total_validations:
                return "VALIDATED"
            elif passed_validations > 0:
                return "PARTIALLY_VALIDATED"
            else:
                return "VALIDATION_FAILED"

        except Exception:
            return "UNKNOWN"

    async def _calculate_completion_percentage(self, phase: str) -> float:
        """Calculate phase completion percentage"""
        try:
            phase_config = self.settings.BETA_PHASES.get(phase, {})
            required_evidence = phase_config.get("required_validations", [])
            if not required_evidence:
                return 0.0

            evidence = await self.get_phase_evidence(phase)
            completed = sum(1 for req in required_evidence if req in evidence)
            return (completed / len(required_evidence)) * 100

        except Exception:
            return 0.0

    async def _calculate_core_metrics(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate core functionality metrics"""
        metrics = {}
        try:
            if "feature_tests" in evidence_data:
                tests = evidence_data["feature_tests"]
                total = len(tests)
                passed = sum(1 for t in tests if t.get("status") == "passed")
                metrics["test_coverage"] = (passed / total) * 100 if total > 0 else 0

            if "performance_metrics" in evidence_data:
                perf = evidence_data["performance_metrics"]
                metrics.update({
                    "avg_response_time": perf.get("avg_response_time"),
                    "error_rate": perf.get("error_rate"),
                    "throughput": perf.get("throughput")
                })

        except Exception as e:
            self.logger.error(f"Error calculating core metrics: {str(e)}")

        return metrics

    async def _calculate_ux_metrics(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate user experience metrics"""
        metrics = {}
        try:
            if "user_feedback" in evidence_data:
                feedback = evidence_data["user_feedback"]
                metrics.update({
                    "satisfaction_score": feedback.get("satisfaction_score"),
                    "usability_score": feedback.get("usability_score"),
                    "feedback_count": len(feedback.get("responses", []))
                })

            if "interaction_metrics" in evidence_data:
                interactions = evidence_data["interaction_metrics"]
                metrics.update({
                    "avg_task_completion_time": interactions.get("avg_completion_time"),
                    "error_rate": interactions.get("error_rate"),
                    "success_rate": interactions.get("success_rate")
                })

        except Exception as e:
            self.logger.error(f"Error calculating UX metrics: {str(e)}")

        return metrics

    async def _calculate_security_metrics(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate security metrics"""
        metrics = {}
        try:
            if "security_audit" in evidence_data:
                audit = evidence_data["security_audit"]
                metrics.update({
                    "vulnerabilities_found": audit.get("total_vulnerabilities", 0),
                    "critical_issues": audit.get("critical_issues", 0),
                    "compliance_score": audit.get("compliance_score", 0)
                })

            if "vulnerability_scan" in evidence_data:
                scan = evidence_data["vulnerability_scan"]
                metrics.update({
                    "scan_coverage": scan.get("coverage_percentage", 0),
                    "risk_score": scan.get("risk_score", 0),
                    "remediation_rate": scan.get("remediation_rate", 0)
                })

        except Exception as e:
            self.logger.error(f"Error calculating security metrics: {str(e)}")

        return metrics

    async def get_evidence_summary(self, phase: str) -> Dict[str, Any]:
        """Get a summary of all evidence for a phase"""
        try:
            evidence = await self.get_phase_evidence(phase)
            phase_data = await self.get_phase_data(phase)

            return {
                "phase": phase,
                "status": phase_data.get("status", "unknown"),
                "metrics": phase_data.get("metrics", {}),
                "evidence_types": list(evidence.keys()),
                "total_evidence": sum(len(items) for items in evidence.values()),
                "last_update": phase_data.get("last_update"),
                "validation_status": await self._calculate_validation_status(phase),
                "completion_percentage": await self._calculate_completion_percentage(phase)
            }

        except Exception as e:
            self.logger.error(f"Error generating evidence summary: {str(e)}")
            return {"error": str(e)}
