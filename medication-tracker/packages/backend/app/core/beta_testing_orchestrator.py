"""
Beta Testing Orchestrator
Manages and coordinates beta testing processes
Last Updated: 2024-12-30T21:47:37+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime
import asyncio
from collections import defaultdict

from .beta_critical_path import BetaCriticalPath
from .beta_monitoring import BetaMonitoring
from .beta_data_collector import BetaDataCollector
from .beta_enforcement import BetaEnforcer
from .beta_feature_orchestrator import BetaFeatureOrchestrator
from .beta_deployment_orchestrator import BetaDeploymentOrchestrator
from .settings import settings

class BetaTestingOrchestrator:
    """
    Orchestrates the beta testing process
    Maintains critical path alignment and coordinates all beta components
    """
    
    def __init__(self):
        self.critical_path = BetaCriticalPath()
        self.monitoring = BetaMonitoring()
        self.data_collector = BetaDataCollector()
        self.enforcer = BetaEnforcer()
        self.feature_orchestrator = BetaFeatureOrchestrator()
        self.deployment_orchestrator = BetaDeploymentOrchestrator()
        self._state_buffer = defaultdict(dict)
        self._buffer_lock = asyncio.Lock()
        
    async def initialize_beta_phase(self, phase: str) -> Dict:
        """Initialize a new beta testing phase"""
        try:
            # Validate phase
            if phase not in settings.BETA_PHASES:
                raise ValueError(f"Invalid beta phase: {phase}")
                
            # Get phase configuration
            phase_config = settings.BETA_PHASES[phase]
            
            # Initialize monitoring
            await self.monitoring._initialize_monitoring()
            
            # Deploy beta environment
            deployment_result = await self.deployment_orchestrator.deploy_beta({
                "phase": phase,
                "config": phase_config
            })
            
            if not deployment_result["success"]:
                return {
                    "success": False,
                    "error": "Beta deployment failed",
                    "details": deployment_result["error"]
                }
                
            # Initialize feature orchestration
            feature_result = await self.feature_orchestrator.initialize_features(phase)
            
            if not feature_result["success"]:
                return {
                    "success": False,
                    "error": "Feature initialization failed",
                    "details": feature_result["error"]
                }
                
            return {
                "success": True,
                "phase": phase,
                "config": phase_config,
                "deployment": deployment_result,
                "features": feature_result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Beta phase initialization failed",
                "details": str(e)
            }
            
    async def monitor_beta_progress(self, phase: str) -> Dict:
        """Monitor overall beta testing progress"""
        try:
            # Collect metrics
            metrics = await self.data_collector.collect_beta_metrics(phase)
            
            # Get critical path status
            critical_path_status = await self.critical_path.monitor_critical_path(phase)
            
            # Get feature status
            feature_status = await self.feature_orchestrator.get_feature_status(phase)
            
            # Validate against phase requirements
            phase_config = settings.BETA_PHASES[phase]
            required_validations = phase_config["required_validations"]
            
            validation_status = all(
                validation in metrics["completed_validations"]
                for validation in required_validations
            )
            
            return {
                "phase": phase,
                "metrics": metrics,
                "critical_path_status": critical_path_status,
                "feature_status": feature_status,
                "validation_status": validation_status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Beta progress monitoring failed",
                "details": str(e)
            }
            
    async def validate_phase_completion(self, phase: str) -> Dict:
        """Validate if current phase can be completed"""
        try:
            # Get phase requirements
            phase_config = settings.BETA_PHASES[phase]
            
            # Get current metrics
            metrics = await self.data_collector.collect_beta_metrics(phase)
            
            # Check duration requirement
            duration_weeks = phase_config["duration_weeks"]
            if metrics["duration_weeks"] < duration_weeks:
                return {
                    "can_complete": False,
                    "reason": "Duration requirement not met",
                    "details": {
                        "required_weeks": duration_weeks,
                        "current_weeks": metrics["duration_weeks"]
                    }
                }
                
            # Check validation requirements
            required_validations = phase_config["required_validations"]
            missing_validations = [
                v for v in required_validations 
                if v not in metrics["completed_validations"]
            ]
            
            if missing_validations:
                return {
                    "can_complete": False,
                    "reason": "Missing required validations",
                    "details": {
                        "missing_validations": missing_validations
                    }
                }
                
            # Check user limit
            max_users = phase_config["max_users"]
            if metrics["total_users"] > max_users:
                return {
                    "can_complete": False,
                    "reason": "User limit exceeded",
                    "details": {
                        "max_users": max_users,
                        "current_users": metrics["total_users"]
                    }
                }
                
            # Check critical path status
            critical_path_status = await self.critical_path.monitor_critical_path(phase)
            if not critical_path_status["validation_status"]:
                return {
                    "can_complete": False,
                    "reason": "Critical path validation failed",
                    "details": critical_path_status
                }
                
            return {
                "can_complete": True,
                "metrics": metrics,
                "critical_path_status": critical_path_status
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Phase completion validation failed",
                "details": str(e)
            }
            
    async def transition_to_next_phase(self, current_phase: str) -> Dict:
        """Transition to the next beta phase"""
        try:
            # Validate current phase completion
            completion_status = await self.validate_phase_completion(current_phase)
            
            if not completion_status["can_complete"]:
                return {
                    "success": False,
                    "error": "Cannot transition - current phase incomplete",
                    "details": completion_status
                }
                
            # Determine next phase
            phases = list(settings.BETA_PHASES.keys())
            current_index = phases.index(current_phase)
            
            if current_index >= len(phases) - 1:
                return {
                    "success": False,
                    "error": "No next phase available - beta testing complete",
                    "final_status": completion_status
                }
                
            next_phase = phases[current_index + 1]
            
            # Initialize next phase
            next_phase_result = await self.initialize_beta_phase(next_phase)
            
            if not next_phase_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to initialize next phase",
                    "details": next_phase_result
                }
                
            return {
                "success": True,
                "previous_phase": current_phase,
                "next_phase": next_phase,
                "completion_status": completion_status,
                "initialization_status": next_phase_result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Phase transition failed",
                "details": str(e)
            }
