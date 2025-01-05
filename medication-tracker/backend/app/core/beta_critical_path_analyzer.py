"""
Beta Critical Path Analyzer
Critical Path: BETA-CRITICAL-PATH-*
Last Updated: 2025-01-02T10:59:41+01:00

Analyzes critical path requirements using validation hooks
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from .validation_hooks import ValidationHooks, ValidationStage, ValidationHookPriority, ValidationHook
from .validation_types import ValidationResult, ValidationStatus, ValidationLevel
from .beta_critical_path_orchestrator import BetaCriticalPathOrchestrator
from .beta_validation_evidence import BetaValidationEvidence
from .beta_feedback_collector import BetaFeedbackCollector

logger = logging.getLogger(__name__)

class BetaCriticalPathAnalyzer:
    """Analyzes critical path requirements for beta testing"""
    
    def __init__(self):
        self.orchestrator = BetaCriticalPathOrchestrator()
        self.evidence_collector = BetaValidationEvidence()
        self.feedback_collector = BetaFeedbackCollector()
        self.hooks = ValidationHooks.get_instance()
        
        # Register validation hooks
        self._register_validation_hooks()
        
    def _register_validation_hooks(self):
        """Register validation hooks for critical path analysis"""
        # Critical requirements validation
        self.hooks.register_hook(ValidationHook(
            "critical_requirements",
            ValidationStage.PRE_VALIDATION,
            ValidationHookPriority.CRITICAL,
            self._validate_critical_requirements
        ))
        
        # Critical path readiness validation
        self.hooks.register_hook(ValidationHook(
            "critical_path_readiness",
            ValidationStage.VALIDATION,
            ValidationHookPriority.CRITICAL,
            self._validate_critical_path_readiness
        ))
        
        # Critical feedback validation
        self.hooks.register_hook(ValidationHook(
            "critical_feedback",
            ValidationStage.POST_VALIDATION,
            ValidationHookPriority.HIGH,
            self._validate_critical_feedback
        ))
        
    async def analyze_critical_path(self, phase: str) -> ValidationResult:
        """Analyze critical path requirements for a phase"""
        try:
            # Run all validation hooks
            for stage in [
                ValidationStage.PRE_VALIDATION,
                ValidationStage.VALIDATION,
                ValidationStage.POST_VALIDATION
            ]:
                stage_result = await self.hooks.validate_stage(stage, {"phase": phase})
                if not stage_result["valid"]:
                    return ValidationResult(
                        valid=False,
                        level=ValidationLevel.ERROR,
                        status=ValidationStatus.FAILED,
                        message=f"Stage {stage.value} validation failed",
                        details=stage_result
                    )
                    
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Critical path analysis successful",
                details={"stages": self.hooks.get_validation_state()}
            )
            
        except Exception as e:
            logger.error(f"Critical path analysis failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Critical path analysis failed: {str(e)}"
            )
            
    async def _validate_critical_requirements(self, phase: str) -> ValidationResult:
        """Validate critical requirements for a phase"""
        try:
            requirements = await self.get_critical_requirements(phase)
            if not requirements["valid"]:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Critical requirements validation failed",
                    details=requirements
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Critical requirements validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Critical requirements validation error: {str(e)}"
            )
            
    async def _validate_critical_path_readiness(self, phase: str) -> ValidationResult:
        """Validate critical path readiness"""
        try:
            readiness = await self.validate_critical_path_readiness(phase)
            if not readiness["valid"]:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Critical path readiness validation failed",
                    details=readiness
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Critical path readiness validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Critical path readiness validation error: {str(e)}"
            )
            
    async def _validate_critical_feedback(self, phase: str) -> ValidationResult:
        """Validate critical feedback"""
        try:
            feedback = await self._get_critical_feedback(phase)
            if not feedback["valid"]:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Critical feedback validation failed",
                    details=feedback
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Critical feedback validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Critical feedback validation error: {str(e)}"
            )
            
    async def get_critical_requirements(self, phase: str) -> Dict[str, Any]:
        """Get list of critical requirements for a phase"""
        try:
            requirements = await self.orchestrator.get_requirements(phase)
            critical_requirements = [
                req for req in requirements
                if req["priority"] == "critical"
            ]
            
            return {
                "valid": True,
                "requirements": critical_requirements,
                "count": len(critical_requirements)
            }
            
        except Exception as e:
            logger.error(f"Failed to get critical requirements: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
            
    async def validate_critical_path_readiness(self, phase: str) -> Dict[str, Any]:
        """Validate if the critical path is ready for progression"""
        try:
            # Get requirements
            requirements = await self.get_critical_requirements(phase)
            if not requirements["valid"]:
                return requirements
                
            # Analyze each requirement
            status = {}
            for requirement in requirements["requirements"]:
                result = await self._analyze_requirement(phase, requirement["id"])
                status[requirement["id"]] = result
                
            # Calculate progress
            progress = await self._calculate_progress(status)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(
                phase,
                status,
                progress
            )
            
            return {
                "valid": progress["complete"],
                "status": status,
                "progress": progress,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Failed to validate critical path readiness: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
            
    async def _analyze_requirement(self, phase: str, requirement: str) -> Dict[str, Any]:
        """Analyze a specific requirement"""
        try:
            # Get requirement details
            details = await self.orchestrator.get_requirement_details(
                phase,
                requirement
            )
            
            # Get validation evidence
            evidence = await self.evidence_collector.get_requirement_evidence(
                phase,
                requirement
            )
            
            # Get feedback
            feedback = await self.feedback_collector.get_requirement_feedback(
                phase,
                requirement
            )
            
            return {
                "valid": True,
                "details": details,
                "evidence": evidence,
                "feedback": feedback,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze requirement: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
            
    async def _get_critical_feedback(self, phase: str) -> Dict[str, Any]:
        """Get critical feedback that affects the critical path"""
        try:
            feedback = await self.feedback_collector.get_critical_feedback(phase)
            return {
                "valid": True,
                "feedback": feedback,
                "count": len(feedback)
            }
            
        except Exception as e:
            logger.error(f"Failed to get critical feedback: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
            
    async def _calculate_progress(self, requirement_status: Dict) -> Dict[str, Any]:
        """Calculate critical path progress"""
        try:
            total = len(requirement_status)
            completed = sum(
                1 for status in requirement_status.values()
                if status["valid"]
            )
            
            return {
                "valid": True,
                "total": total,
                "completed": completed,
                "percentage": (completed / total * 100) if total > 0 else 0,
                "complete": completed == total
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate progress: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
            
    async def _generate_recommendations(
        self,
        phase: str,
        requirement_status: Dict,
        progress: Dict
    ) -> List[str]:
        """Generate recommendations for critical path progression"""
        try:
            recommendations = []
            
            # Check incomplete requirements
            for req_id, status in requirement_status.items():
                if not status["valid"]:
                    details = status.get("details", {})
                    recommendations.append(
                        f"Complete requirement {req_id}: {details.get('description', 'No description')}"
                    )
                    
            # Add progress-based recommendations
            if progress["percentage"] < 50:
                recommendations.append(
                    "Critical path progress is low. Focus on completing critical requirements."
                )
            elif progress["percentage"] < 80:
                recommendations.append(
                    "Good progress, but some critical requirements still need attention."
                )
                
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return [f"Error generating recommendations: {str(e)}"]
