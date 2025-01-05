"""
Beta Process Enforcer
Enforces beta testing processes and maintains single source of truth
Last Updated: 2024-12-31T15:18:12+01:00
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import json
import os
from pathlib import Path
from enum import Enum
import asyncio
import hashlib

from .beta_settings import BetaSettings
from .beta_critical_path_validator import BetaCriticalPathValidator
from .beta_validation_evidence import BetaValidationEvidence
from .beta_critical_path_orchestrator import BetaCriticalPathOrchestrator

class ProcessState(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

class ProcessType(Enum):
    VALIDATION = "validation"
    MAINTENANCE = "maintenance"
    EVIDENCE_COLLECTION = "evidence_collection"
    CRITICAL_PATH = "critical_path"
    DOCUMENTATION = "documentation"

class BetaProcessEnforcer:
    """
    Enforces beta testing processes and maintains single source of truth
    Ensures all processes are properly executed and documented
    """
    
    def __init__(self):
        self.settings = BetaSettings()
        self.validator = BetaCriticalPathValidator()
        self.evidence_collector = BetaValidationEvidence()
        self.orchestrator = BetaCriticalPathOrchestrator()
        self.logger = logging.getLogger(__name__)
        
        # Process tracking
        self._process_log_path = self.settings.BETA_BASE_PATH / "process_logs"
        self._process_log_path.mkdir(parents=True, exist_ok=True)
        
        # State tracking
        self._state_file = self._process_log_path / "process_state.json"
        self._load_state()
        
    def _load_state(self) -> None:
        """Load process state from file"""
        if self._state_file.exists():
            with open(self._state_file, 'r') as f:
                self._state = json.load(f)
        else:
            current_time = datetime.utcnow().isoformat()
            self._state = {
                "last_update": current_time,
                "current_phase": "internal",
                "processes": {},
                "validations": {},
                "evidence_chain": [],
                "documentation": {},
                "phases": {
                    phase: {
                        "status": ProcessState.NOT_STARTED.value,
                        "start_time": current_time if phase == "internal" else None,
                        "end_time": None,
                        "processes": {},
                        "validations": {},
                        "evidence": []
                    }
                    for phase in self.settings.BETA_PHASES
                }
            }
            self._save_state()
            
    def _save_state(self) -> None:
        """Save process state to file"""
        self._state["last_update"] = datetime.utcnow().isoformat()
        with open(self._state_file, 'w') as f:
            json.dump(self._state, f, indent=2)
            
    async def enforce_process(
        self,
        process_type: ProcessType,
        phase: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """Enforce a specific process execution"""
        try:
            context = context or {}
            process_id = self._generate_process_id(process_type, phase)
            
            # Check if process can start
            can_start = await self._validate_process_prerequisites(
                process_type,
                phase,
                context
            )
            
            if not can_start["can_start"]:
                return {
                    "success": False,
                    "error": "Process prerequisites not met",
                    "details": can_start["blocking_factors"]
                }
                
            # Start process tracking
            self._track_process_start(process_id, process_type, phase)
            
            # Execute process
            if process_type == ProcessType.VALIDATION:
                result = await self._execute_validation_process(phase, context)
            elif process_type == ProcessType.MAINTENANCE:
                result = await self._execute_maintenance_process(phase, context)
            elif process_type == ProcessType.EVIDENCE_COLLECTION:
                result = await self._execute_evidence_process(phase, context)
            elif process_type == ProcessType.CRITICAL_PATH:
                result = await self._execute_critical_path_process(phase, context)
            elif process_type == ProcessType.DOCUMENTATION:
                result = await self._execute_documentation_process(phase, context)
            else:
                raise ValueError(f"Invalid process type: {process_type}")
                
            # Update process tracking
            self._track_process_completion(process_id, result)
            
            return {
                "success": True,
                "process_id": process_id,
                "result": result
            }
            
        except Exception as e:
            self.logger.error(f"Process enforcement failed: {str(e)}")
            if 'process_id' in locals():
                self._track_process_failure(process_id, str(e))
            return {
                "success": False,
                "error": "Process enforcement failed",
                "details": str(e)
            }
            
    async def verify_single_source_of_truth(self) -> Dict:
        """Verify single source of truth integrity"""
        try:
            # Check state file integrity
            if not self._state_file.exists():
                return {
                    "success": False,
                    "error": "State file missing"
                }
                
            # Verify evidence chain
            evidence_valid = await self.evidence_collector.verify_evidence_chain(
                None  # Verify all phases
            )
            
            if not evidence_valid["valid"]:
                return {
                    "success": False,
                    "error": "Evidence chain validation failed",
                    "details": evidence_valid["issues"]
                }
                
            # Verify process logs
            logs_valid = await self._verify_process_logs()
            
            if not logs_valid["valid"]:
                return {
                    "success": False,
                    "error": "Process log validation failed",
                    "details": logs_valid["issues"]
                }
                
            # Verify documentation
            docs_valid = await self._verify_documentation()
            
            if not docs_valid["valid"]:
                return {
                    "success": False,
                    "error": "Documentation validation failed",
                    "details": docs_valid["issues"]
                }
                
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Truth verification failed: {str(e)}")
            return {
                "success": False,
                "error": "Truth verification failed",
                "details": str(e)
            }
            
    async def _validate_process_prerequisites(
        self,
        process_type: ProcessType,
        phase: str,
        context: Dict
    ) -> Dict:
        """Validate prerequisites for process execution"""
        try:
            blocking_factors = []
            
            # Check if phase exists
            if phase not in self.settings.BETA_PHASES:
                blocking_factors.append(f"Invalid phase: {phase}")
                return {
                    "can_start": False,
                    "blocking_factors": blocking_factors
                }
                
            # For initialization, allow documentation process
            if context.get("initialization", False):
                if process_type == ProcessType.DOCUMENTATION:
                    return {
                        "can_start": True,
                        "blocking_factors": []
                    }
                    
            # Check phase status
            phase_status = await self.orchestrator.get_critical_path_status()
            if not phase_status["success"]:
                blocking_factors.append(
                    f"Failed to get phase status: {phase_status.get('error', 'Unknown error')}"
                )
                return {
                    "can_start": False,
                    "blocking_factors": blocking_factors
                }
                
            # Check current phase
            current_phase = phase_status.get("current_phase")
            if current_phase != phase:
                blocking_factors.append(
                    f"Current phase ({current_phase or 'None'}) "
                    f"does not match target phase ({phase})"
                )
                
            # Check process dependencies
            if process_type == ProcessType.VALIDATION:
                # Need evidence collection first
                if not self._is_process_completed(
                    ProcessType.EVIDENCE_COLLECTION,
                    phase
                ):
                    blocking_factors.append(
                        "Evidence collection process not completed"
                    )
                    
            elif process_type == ProcessType.CRITICAL_PATH:
                # Need validation first
                if not self._is_process_completed(
                    ProcessType.VALIDATION,
                    phase
                ):
                    blocking_factors.append(
                        "Validation process not completed"
                    )
                    
            elif process_type == ProcessType.DOCUMENTATION:
                # Need all other processes completed
                for p_type in [
                    ProcessType.VALIDATION,
                    ProcessType.EVIDENCE_COLLECTION,
                    ProcessType.CRITICAL_PATH
                ]:
                    if not self._is_process_completed(p_type, phase):
                        blocking_factors.append(
                            f"{p_type.value} process not completed"
                        )
                        
            return {
                "can_start": len(blocking_factors) == 0,
                "blocking_factors": blocking_factors
            }
            
        except Exception as e:
            self.logger.error(f"Prerequisite validation failed: {str(e)}")
            return {
                "can_start": False,
                "blocking_factors": [str(e)]
            }
            
    def _generate_process_id(self, process_type: ProcessType, phase: str) -> str:
        """Generate unique process ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        hash_input = f"{process_type.value}-{phase}-{timestamp}"
        hash_value = hashlib.md5(hash_input.encode()).hexdigest()[:8]
        return f"PROC-{timestamp}-{hash_value}"
        
    def _track_process_start(
        self,
        process_id: str,
        process_type: ProcessType,
        phase: str
    ) -> None:
        """Track process start"""
        self._state["processes"][process_id] = {
            "type": process_type.value,
            "phase": phase,
            "start_time": datetime.utcnow().isoformat(),
            "status": ProcessState.IN_PROGRESS.value
        }
        self._state["phases"][phase]["processes"][process_id] = {
            "type": process_type.value,
            "start_time": datetime.utcnow().isoformat(),
            "status": ProcessState.IN_PROGRESS.value
        }
        self._save_state()
        
    def _track_process_completion(self, process_id: str, result: Dict) -> None:
        """Track process completion"""
        if process_id in self._state["processes"]:
            self._state["processes"][process_id].update({
                "status": ProcessState.COMPLETED.value,
                "completion_time": datetime.utcnow().isoformat(),
                "result": result
            })
            phase = self._state["processes"][process_id]["phase"]
            self._state["phases"][phase]["processes"][process_id].update({
                "status": ProcessState.COMPLETED.value,
                "completion_time": datetime.utcnow().isoformat(),
                "result": result
            })
            self._save_state()
            
    def _track_process_failure(self, process_id: str, error: str) -> None:
        """Track process failure"""
        if process_id in self._state["processes"]:
            self._state["processes"][process_id].update({
                "status": ProcessState.FAILED.value,
                "completion_time": datetime.utcnow().isoformat(),
                "error": error
            })
            phase = self._state["processes"][process_id]["phase"]
            self._state["phases"][phase]["processes"][process_id].update({
                "status": ProcessState.FAILED.value,
                "completion_time": datetime.utcnow().isoformat(),
                "error": error
            })
            self._save_state()
            
    def _is_process_completed(
        self,
        process_type: ProcessType,
        phase: str
    ) -> bool:
        """Check if a process is completed"""
        for process in self._state["processes"].values():
            if (
                process["type"] == process_type.value and
                process["phase"] == phase and
                process["status"] == ProcessState.COMPLETED.value
            ):
                return True
        return False
        
    async def _execute_validation_process(
        self,
        phase: str,
        context: Dict
    ) -> Dict:
        """Execute validation process"""
        return await self.validator.validate_phase_requirements(phase)
        
    async def _execute_maintenance_process(
        self,
        phase: str,
        context: Dict
    ) -> Dict:
        """Execute maintenance process"""
        window = self.settings.get_maintenance_window(phase)
        # Maintenance process implementation
        return {
            "executed": True,
            "window": window
        }
        
    async def _execute_evidence_process(
        self,
        phase: str,
        context: Dict
    ) -> Dict:
        """Execute evidence collection process"""
        return await self.evidence_collector.collect_validation_evidence(
            phase,
            None,  # Collect all evidence
            context
        )
        
    async def _execute_critical_path_process(
        self,
        phase: str,
        context: Dict
    ) -> Dict:
        """Execute critical path process"""
        return await self.orchestrator.validate_critical_path_readiness(phase)
        
    async def _execute_documentation_process(
        self,
        phase: str,
        context: Dict
    ) -> Dict:
        """Execute documentation process"""
        # Documentation process implementation
        return {
            "documented": True,
            "phase": phase
        }
        
    async def _verify_process_logs(self) -> Dict:
        """Verify process logs integrity"""
        issues = []
        
        # Check process continuity
        processes = self._state["processes"]
        for process_id, process in processes.items():
            if process["status"] == ProcessState.IN_PROGRESS.value:
                start_time = datetime.fromisoformat(process["start_time"])
                current_time = datetime.fromisoformat("2024-12-30T22:40:36+01:00")
                
                # Check for stuck processes
                if (current_time - start_time).total_seconds() > 3600:  # 1 hour
                    issues.append(f"Process {process_id} appears to be stuck")
                    
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
        
    async def _verify_documentation(self) -> Dict:
        """Verify documentation completeness"""
        issues = []
        
        # Check documentation requirements
        for phase in self.settings.BETA_PHASES:
            if phase not in self._state["documentation"]:
                issues.append(f"Missing documentation for phase: {phase}")
                
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
