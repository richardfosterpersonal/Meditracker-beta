"""
Beta Testing Initializer
Handles beta testing initialization and kickoff
Last Updated: 2024-12-30T22:49:52+01:00
"""

from typing import Dict, Optional
from datetime import datetime
import logging
import asyncio
import os
from pathlib import Path

from .beta_settings import BetaSettings
from .beta_critical_path_monitor import BetaCriticalPathMonitor
from .beta_process_enforcer import BetaProcessEnforcer, ProcessType
from .beta_validation_evidence import BetaValidationEvidence

class BetaInitializer:
    """
    Initializes and kicks off beta testing process
    Ensures proper setup and validation before starting
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.monitor = BetaCriticalPathMonitor()
        self.enforcer = BetaProcessEnforcer()
        self.evidence_collector = BetaValidationEvidence()
        self.logger = logging.getLogger(__name__)
        
    async def initialize_beta_testing(self) -> Dict:
        """Initialize beta testing infrastructure"""
        try:
            # Create required directories
            await self._create_directories()
            
            # Initialize evidence collection
            evidence_init = await self._initialize_evidence_collection()
            if not evidence_init["success"]:
                return evidence_init
                
            # Initialize process tracking
            process_init = await self._initialize_process_tracking()
            if not process_init["success"]:
                return process_init
                
            # Initialize monitoring
            monitor_init = await self._initialize_monitoring()
            if not monitor_init["success"]:
                return monitor_init
                
            # Verify initialization
            verification = await self._verify_initialization()
            if not verification["success"]:
                return verification
                
            return {
                "success": True,
                "message": "Beta testing infrastructure initialized",
                "timestamp": datetime.utcnow().isoformat(),
                "evidence_init": evidence_init,
                "process_init": process_init,
                "monitor_init": monitor_init,
                "verification": verification
            }
            
        except Exception as e:
            self.logger.error(f"Beta initialization failed: {str(e)}")
            return {
                "success": False,
                "error": "Beta initialization failed",
                "details": str(e)
            }
            
    async def kickoff_beta_phase(self, phase: str) -> Dict:
        """Kickoff a new beta testing phase"""
        try:
            # Validate phase
            if phase not in self.settings.BETA_PHASES:
                return {
                    "success": False,
                    "error": f"Invalid phase: {phase}"
                }
                
            # Check if ready for kickoff
            readiness = await self._check_phase_kickoff_readiness(phase)
            if not readiness["ready"]:
                return {
                    "success": False,
                    "error": "Not ready for kickoff",
                    "blocking_factors": readiness["blocking_factors"]
                }
                
            # Initialize phase
            phase_init = await self._initialize_phase(phase)
            if not phase_init["success"]:
                return phase_init
                
            # Start monitoring
            monitor_start = await self._start_phase_monitoring(phase)
            if not monitor_start["success"]:
                return monitor_start
                
            # Set up evidence collection
            evidence_setup = await self._setup_phase_evidence(phase)
            if not evidence_setup["success"]:
                return evidence_setup
                
            return {
                "success": True,
                "phase": phase,
                "message": f"Beta phase {phase} kicked off successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "phase_init": phase_init,
                "monitor_start": monitor_start,
                "evidence_setup": evidence_setup
            }
            
        except Exception as e:
            self.logger.error(f"Beta phase kickoff failed: {str(e)}")
            return {
                "success": False,
                "error": "Beta phase kickoff failed",
                "details": str(e)
            }
            
    async def _create_directories(self) -> None:
        """Create required directories"""
        directories = [
            self.settings.BETA_EVIDENCE_PATH,
            self.settings.BETA_FEEDBACK_PATH,
            self.settings.BETA_LOGS_PATH
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            
    async def _initialize_evidence_collection(self) -> Dict:
        """Initialize evidence collection system"""
        try:
            # Initialize evidence collector
            await self.evidence_collector.initialize_evidence_chain()
            
            # Verify evidence paths
            paths_valid = await self._verify_evidence_paths()
            if not paths_valid["valid"]:
                return {
                    "success": False,
                    "error": "Evidence paths validation failed",
                    "details": paths_valid["issues"]
                }
                
            return {
                "success": True,
                "message": "Evidence collection initialized"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Evidence initialization failed",
                "details": str(e)
            }
            
    async def _initialize_process_tracking(self) -> Dict:
        """Initialize process tracking"""
        try:
            # Initialize process enforcer
            result = await self.enforcer.enforce_process(
                ProcessType.DOCUMENTATION,
                "internal",  # Start with internal phase
                {"initialization": True}
            )
            
            if not result["success"]:
                return result
                
            return {
                "success": True,
                "message": "Process tracking initialized"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Process tracking initialization failed",
                "details": str(e)
            }
            
    async def _initialize_monitoring(self) -> Dict:
        """Initialize monitoring system"""
        try:
            # Start with internal phase monitoring
            result = await self.monitor.monitor_critical_path("internal")
            
            if not result["success"]:
                return result
                
            return {
                "success": True,
                "message": "Monitoring initialized"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": "Monitoring initialization failed",
                "details": str(e)
            }
            
    async def _verify_initialization(self) -> Dict:
        """Verify initialization status"""
        issues = []
        
        # Check directories
        for directory in [
            self.settings.BETA_EVIDENCE_PATH,
            self.settings.BETA_FEEDBACK_PATH,
            self.settings.BETA_LOGS_PATH
        ]:
            if not os.path.exists(directory):
                issues.append(f"Directory not created: {directory}")
                
        # Check evidence chain
        evidence_valid = await self.evidence_collector.verify_evidence_chain(None)
        if not evidence_valid["valid"]:
            issues.extend(evidence_valid["issues"])
            
        # Check process tracking
        process_valid = await self.enforcer.verify_single_source_of_truth()
        if not process_valid["success"]:
            issues.append(process_valid["error"])
            
        return {
            "success": len(issues) == 0,
            "issues": issues
        }
        
    async def _verify_evidence_paths(self) -> Dict:
        """Verify evidence collection paths"""
        try:
            # Check evidence root directory
            if not os.path.exists(self.settings.BETA_EVIDENCE_PATH):
                return {
                    "valid": False,
                    "issues": ["Evidence root directory missing"]
                }
                
            # Create phase directories
            for phase in self.settings.BETA_PHASES:
                phase_path = os.path.join(self.settings.BETA_EVIDENCE_PATH, phase)
                os.makedirs(phase_path, exist_ok=True)
                
            return {
                "valid": True,
                "issues": []
            }
            
        except Exception as e:
            self.logger.error(f"Evidence path verification failed: {str(e)}")
            return {
                "valid": False,
                "issues": [f"Evidence path verification failed: {str(e)}"]
            }
        
    async def _check_phase_kickoff_readiness(self, phase: str) -> Dict:
        """Check if ready for phase kickoff"""
        blocking_factors = []
        
        # Check if first phase
        if phase == "internal":
            # Verify initialization
            init_verify = await self._verify_initialization()
            if not init_verify["success"]:
                blocking_factors.extend(init_verify["issues"])
        else:
            # Check previous phase completion
            phases = list(self.settings.BETA_PHASES.keys())
            prev_phase = phases[phases.index(phase) - 1]
            
            prev_status = await self.monitor.monitor_critical_path(prev_phase)
            if not prev_status["success"] or not prev_status.get("can_progress", False):
                blocking_factors.append(f"Previous phase {prev_phase} not completed")
                
        return {
            "ready": len(blocking_factors) == 0,
            "blocking_factors": blocking_factors
        }
        
    async def _initialize_phase(self, phase: str) -> Dict:
        """Initialize a new beta phase"""
        try:
            # Get phase configuration
            phase_config = self.settings.get_phase_config(phase)
            
            # Create phase directory
            phase_path = os.path.join(self.settings.BETA_EVIDENCE_PATH, phase)
            os.makedirs(phase_path, exist_ok=True)
            
            # Initialize phase tracking
            result = await self.enforcer.enforce_process(
                ProcessType.CRITICAL_PATH,
                phase,
                {"initialization": True}
            )
            
            if not result["success"]:
                return result
                
            return {
                "success": True,
                "message": f"Phase {phase} initialized",
                "config": phase_config
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Phase initialization failed: {str(e)}"
            }
            
    async def _start_phase_monitoring(self, phase: str) -> Dict:
        """Start monitoring for a phase"""
        try:
            # Initialize monitoring
            result = await self.monitor.monitor_critical_path(phase)
            
            if not result["success"]:
                return result
                
            return {
                "success": True,
                "message": f"Phase {phase} monitoring started"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Monitoring start failed: {str(e)}"
            }
            
    async def _setup_phase_evidence(self, phase: str) -> Dict:
        """Set up evidence collection for a phase"""
        try:
            # Initialize evidence collection
            result = await self.evidence_collector.initialize_phase_evidence(phase)
            
            if not result["success"]:
                return result
                
            return {
                "success": True,
                "message": f"Phase {phase} evidence collection setup"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Evidence setup failed: {str(e)}"
            }
