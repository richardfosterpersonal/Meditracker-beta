"""
Beta Critical Path Orchestrator
Orchestrates the beta testing critical path
Last Updated: 2025-01-01T19:35:37+01:00
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import json
import os
from pathlib import Path
from datetime import timezone as tz
from collections import defaultdict

from .beta_settings import BetaSettings
from .beta_monitoring import BetaMonitoring
from .beta_data_collector import BetaDataCollector
from .beta_validation_evidence import BetaValidationEvidence
from ..infrastructure.notification.notification_factory import NotificationFactory, NotificationType

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class BetaCriticalPhase(Enum):
    """Critical path phases"""
    ONBOARDING = 1
    CORE_FEATURES = 2
    DATA_SAFETY = 3
    USER_EXPERIENCE = 4

class BetaPhaseStatus(Enum):
    """Beta phase status states"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    VALIDATING = "validating"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"

class BetaCriticalPathOrchestrator:
    """Orchestrates beta testing critical path"""
    
    def __init__(self, settings: Optional[BetaSettings] = None):
        """Initialize the orchestrator"""
        self.settings = settings or BetaSettings()
        self.logger = logging.getLogger(__name__)
        self.notification_factory = NotificationFactory()
        
        # Phase mapping
        self.phase_mapping = {
            "ONBOARDING": "internal",
            "CORE_FEATURES": "internal",
            "DATA_SAFETY": "limited",
            "USER_EXPERIENCE": "open"
        }
        
        # Initialize evidence
        self.evidence = BetaValidationEvidence()
        
        # Validate critical components on initialization
        self._validate_initialization()
        
        # Ensure data directory exists
        self._data_dir = Path("data/beta")
        self._validate_directory_structure()
        
        # Set state file path
        self._state_file = self._data_dir / "state.json"
        
        # Initialize state with validation
        self._initialize_state()
        
    def _validate_initialization(self) -> None:
        """Validate critical components during initialization"""
        # Validate phase mapping
        required_phases = ["ONBOARDING", "CORE_FEATURES", "DATA_SAFETY", "USER_EXPERIENCE"]
        valid_beta_phases = ["internal", "limited", "open"]
        
        for phase in required_phases:
            if phase not in self.phase_mapping:
                raise ValidationError(f"Missing required phase mapping: {phase}")
            if self.phase_mapping[phase] not in valid_beta_phases:
                raise ValidationError(f"Invalid beta phase {self.phase_mapping[phase]} for {phase}")
                
        # Validate settings
        if not self.settings.BETA_BASE_PATH.exists():
            raise ValidationError("Beta base path does not exist")
        if not self.settings.EVIDENCE_PATH.exists():
            raise ValidationError("Evidence path does not exist")
            
        # Validate phase configurations
        for phase in valid_beta_phases:
            config = self.settings.get_phase_config(phase)
            if config is None:
                raise ValidationError(f"Missing configuration for phase {phase}")
            if "validation_rules" not in config:
                raise ValidationError(f"Missing validation rules for phase {phase}")
                
    def _validate_directory_structure(self) -> None:
        """Validate and create required directory structure"""
        required_dirs = ["evidence", "feedback", "logs", "db"]
        
        # Create base directory if needed
        self._data_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate base directory is writable
        if not os.access(self._data_dir, os.W_OK):
            raise ValidationError(f"Base directory not writable: {self._data_dir}")
            
        # Create and validate subdirectories
        for dir_name in required_dirs:
            dir_path = self._data_dir / dir_name
            dir_path.mkdir(exist_ok=True)
            
            if not dir_path.exists():
                raise ValidationError(f"Failed to create directory: {dir_path}")
            if not os.access(dir_path, os.W_OK):
                raise ValidationError(f"Directory not writable: {dir_path}")
                
    def _validate_evidence_data(self, evidence_data: Dict) -> None:
        """Validate evidence data structure and required fields"""
        required_fields = ["phase", "component", "status", "data"]
        required_phases = ["internal", "limited", "open"]
        required_statuses = ["verified"]
        
        for evidence_id, data in evidence_data.items():
            # Check required fields
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                raise ValidationError(f"Missing required fields in evidence {evidence_id}: {missing_fields}")
                
            # Check phase validity
            if data.get("phase") not in required_phases:
                raise ValidationError(f"Invalid phase in evidence {evidence_id}: {data.get('phase')}")
                
            # Check status validity
            if data.get("status") not in required_statuses:
                raise ValidationError(f"Invalid status in evidence {evidence_id}: {data.get('status')}")
                
            # Check data field is dict
            if not isinstance(data.get("data"), dict):
                raise ValidationError(f"Invalid data structure in evidence {evidence_id}")
                
    def _initialize_state(self) -> None:
        """Initialize state with validation"""
        # Initialize default state
        self._state = {
            "current_phase": BetaCriticalPhase.ONBOARDING,
            "completed_phases": [],
            "timestamp": datetime.utcnow().isoformat(),
            "phase_statuses": {}
        }
        
        # Try to load existing state
        if self._state_file.exists():
            try:
                with open(self._state_file) as f:
                    loaded_state = json.load(f)
                    
                # Validate loaded state has required fields
                required_fields = ["current_phase", "completed_phases", "timestamp", "phase_statuses"]
                missing_fields = [field for field in required_fields if field not in loaded_state]
                if missing_fields:
                    raise ValidationError(f"State file missing required fields: {missing_fields}")
                    
                # Convert string phase names to enums
                if isinstance(loaded_state["current_phase"], str):
                    loaded_state["current_phase"] = BetaCriticalPhase[loaded_state["current_phase"]]
                    
                completed_phases = []
                for phase in loaded_state["completed_phases"]:
                    if isinstance(phase, str):
                        completed_phases.append(BetaCriticalPhase[phase])
                    else:
                        completed_phases.append(phase)
                loaded_state["completed_phases"] = completed_phases
                
                self._state = loaded_state
                
            except (json.JSONDecodeError, KeyError, ValidationError) as e:
                self.logger.warning(f"Failed to load state file: {e}, using default state")
                self._save_state()
        else:
            self._save_state()
            
    async def _verify_phase_requirements(self, phase: str) -> Dict[str, Any]:
        """Verify phase requirements with validation"""
        try:
            # Get beta phase type
            beta_phase = self.phase_mapping.get(phase)
            if not beta_phase:
                raise ValidationError(f"No beta phase mapping for {phase}")
                
            # Get phase configuration
            phase_config = self.settings.get_phase_config(beta_phase)
            if not phase_config:
                raise ValidationError(f"No configuration for phase {beta_phase}")
                
            # Get validation rules
            validation_rules = phase_config.get("validation_rules")
            if not validation_rules:
                raise ValidationError(f"No validation rules for phase {beta_phase}")
                
            # Verify each component
            results = {}
            for component, rule in validation_rules.items():
                evidence_id = rule.get("evidence_id")
                if not evidence_id:
                    raise ValidationError(f"Missing evidence ID for {component}")
                    
                # Verify evidence chain
                result = await self.evidence.verify_evidence_chain(beta_phase, evidence_id)
                if not result:
                    raise ValidationError(f"Failed to verify evidence for {component}")
                    
                results[component] = {
                    "valid": result.get("valid", False),
                    "message": result.get("message", ""),
                    "details": {
                        "evidence_id": evidence_id,
                        **result.get("data", {})
                    }
                }
                
            return results
            
        except Exception as e:
            self.logger.error(f"Failed to verify phase requirements: {str(e)}")
            raise
            
    def _save_state(self) -> None:
        """Save current state to file with validation"""
        try:
            # Create a copy of state for serialization
            state_copy = self._state.copy()
            
            # Convert enum phases to strings
            if isinstance(state_copy["current_phase"], BetaCriticalPhase):
                state_copy["current_phase"] = state_copy["current_phase"].name
                
            completed_phases = []
            for phase in state_copy["completed_phases"]:
                if isinstance(phase, BetaCriticalPhase):
                    completed_phases.append(phase.name)
                else:
                    completed_phases.append(phase)
            state_copy["completed_phases"] = completed_phases
            
            # Validate state structure before saving
            required_fields = ["current_phase", "completed_phases", "timestamp", "phase_statuses"]
            missing_fields = [field for field in required_fields if field not in state_copy]
            if missing_fields:
                raise ValidationError(f"State missing required fields: {missing_fields}")
                
            # Save to file
            with open(self._state_file, "w") as f:
                json.dump(state_copy, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to save state: {str(e)}")
            raise
            
    async def start_phase(self, phase_name: str) -> Dict[str, Any]:
        """Start a beta testing phase with validation"""
        try:
            # Convert phase name to enum
            try:
                phase = BetaCriticalPhase[phase_name]
            except KeyError:
                return {
                    "success": False,
                    "error": f"Invalid phase name: {phase_name}",
                    "beta_phase": None
                }

            # Check if phase is already completed
            if phase in [BetaCriticalPhase[p] if isinstance(p, str) else p 
                        for p in self._state["completed_phases"]]:
                return {
                    "success": False, 
                    "error": f"Phase {phase_name} already completed",
                    "beta_phase": None
                }

            # Get current phase as enum
            current = self._state["current_phase"]
            if isinstance(current, str):
                current = BetaCriticalPhase[current]

            # Validate phase sequence
            if phase.value != current.value:
                if phase.value > current.value + 1:
                    return {
                        "success": False,
                        "error": f"Cannot skip to phase {phase_name}",
                        "beta_phase": None
                    }
                elif phase.value < current.value:
                    return {
                        "success": False,
                        "error": f"Cannot go back to phase {phase_name}",
                        "beta_phase": None
                    }

            # Verify phase requirements
            requirements = await self._verify_phase_requirements(phase_name)
            if not all(r["valid"] for r in requirements.values()):
                return {
                    "success": False,
                    "error": "Phase requirements not met",
                    "details": {
                        component: r["message"] 
                        for component, r in requirements.items() 
                        if not r["valid"]
                    },
                    "beta_phase": None
                }

            # Map phase to beta phase type
            beta_phase = self.phase_mapping.get(phase_name)
            if not beta_phase:
                return {
                    "success": False,
                    "error": f"No beta phase mapping for {phase_name}",
                    "beta_phase": None
                }

            # Update state
            self._state["current_phase"] = phase
            self._state["timestamp"] = datetime.utcnow().isoformat()
            self._state["phase_statuses"][phase_name] = BetaPhaseStatus.IN_PROGRESS.value
            self._save_state()

            # Return success
            return {
                "success": True,
                "beta_phase": beta_phase
            }

        except Exception as e:
            self.logger.error(f"Failed to start phase {phase_name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "beta_phase": None
            }
            
    async def complete_phase(self, phase: BetaCriticalPhase) -> None:
        """Complete a phase with validation"""
        # Validate phase status
        current_status = self.get_phase_status(phase)
        if current_status != BetaPhaseStatus.VALIDATING:
            raise ValidationError(f"Phase {phase} must be in VALIDATING status to be completed")

        # Validate phase requirements
        if not self._state.get("phase_evidence", {}).get(phase.name):
            raise ValidationError(f"Phase {phase} requires evidence before completion")

        # Validate evidence
        evidence = self._state["phase_evidence"][phase.name]
        self.validate_phase_requirements(phase, evidence)

        # Update phase status
        self._state["phase_statuses"][phase.name] = BetaPhaseStatus.COMPLETED.value
        self._save_state()
        
    async def validate_phase_requirements(self, phase: BetaCriticalPhase, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate requirements for a phase with evidence collection"""
        try:
            phase_name = phase.name
            phase_config = self.settings.BETA_PHASES[self.phase_mapping[phase_name]]
            
            # Initialize validation result
            validation_result = {
                "status": "pending",
                "phase": phase_name,
                "timestamp": datetime.utcnow().isoformat(),
                "evidence": {},
                "errors": []
            }
            
            # Collect and validate evidence
            try:
                collected_evidence = await self.evidence.collect_evidence(phase_name, evidence_data)
                validation_result["evidence"] = collected_evidence
                
                # Validate against phase requirements
                requirements_met = True
                for req in phase_config["required_validations"]:
                    if req not in collected_evidence or not collected_evidence[req].get("valid", False):
                        requirements_met = False
                        validation_result["errors"].append(f"Missing or invalid evidence for {req}")
                
                validation_result["status"] = "success" if requirements_met else "failed"
                return validation_result
                
            except ValidationError as e:
                validation_result["status"] = "failed"
                validation_result["errors"].append(str(e))
                return validation_result
                
        except Exception as e:
            self.logger.error(f"Error validating phase {phase_name}: {str(e)}")
            raise ValidationError(f"Phase validation failed: {str(e)}")

    async def transition_phase(self, phase: BetaCriticalPhase, new_status: BetaPhaseStatus) -> Dict[str, Any]:
        """Transition a phase to a new status with validation"""
        try:
            phase_name = phase.name
            current_status = await self._get_phase_status(phase)
            
            # Validate transition
            if not self._is_valid_transition(current_status, new_status):
                raise ValidationError(f"Invalid transition from {current_status} to {new_status}")
            
            # Check if previous phases are completed
            if new_status == BetaPhaseStatus.IN_PROGRESS:
                await self._validate_previous_phases(phase)
            
            # Update phase status
            result = await self._update_phase_status(phase, new_status)
            
            # Log transition
            self.logger.info(f"Phase {phase_name} transitioned from {current_status} to {new_status}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error transitioning phase {phase_name}: {str(e)}")
            raise ValidationError(f"Phase transition failed: {str(e)}")

    async def _validate_previous_phases(self, phase: BetaCriticalPhase) -> None:
        """Validate that all previous phases are completed"""
        try:
            phase_order = list(BetaCriticalPhase)
            current_index = phase_order.index(phase)
            
            for prev_phase in phase_order[:current_index]:
                status = await self._get_phase_status(prev_phase)
                if status != BetaPhaseStatus.COMPLETED:
                    raise ValidationError(f"Previous phase {prev_phase.name} not completed")
                    
        except Exception as e:
            raise ValidationError(f"Error validating previous phases: {str(e)}")

    def _is_valid_transition(self, current_status: BetaPhaseStatus, new_status: BetaPhaseStatus) -> bool:
        """Check if a status transition is valid"""
        valid_transitions = {
            BetaPhaseStatus.NOT_STARTED: [BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.IN_PROGRESS: [BetaPhaseStatus.VALIDATING, BetaPhaseStatus.BLOCKED],
            BetaPhaseStatus.VALIDATING: [BetaPhaseStatus.COMPLETED, BetaPhaseStatus.FAILED],
            BetaPhaseStatus.BLOCKED: [BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.FAILED: [BetaPhaseStatus.IN_PROGRESS]
        }
        
        return new_status in valid_transitions.get(current_status, [])

    async def _get_phase_status(self, phase: BetaCriticalPhase) -> BetaPhaseStatus:
        """Get current status of a phase"""
        status_value = self._state.get("phase_statuses", {}).get(phase.name, "not_started")
        return BetaPhaseStatus(status_value)

    async def _update_phase_status(self, phase: BetaCriticalPhase, new_status: BetaPhaseStatus) -> Dict[str, Any]:
        """Update phase status"""
        self._state["phase_statuses"][phase.name] = new_status.value
        self._save_state()
        return {
            "success": True,
            "phase": phase.name,
            "status": new_status.value
        }

    def execute_phase(self, phase: BetaCriticalPhase, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a phase with validation and evidence collection"""
        # Initialize phase if needed
        if phase.name not in self._state["phase_statuses"]:
            self._state["phase_statuses"][phase.name] = BetaPhaseStatus.NOT_STARTED.value
            self._state["current_phase"] = phase

        # Validate current phase
        if phase != self._state["current_phase"]:
            raise ValidationError(f"Cannot execute phase {phase} - not the current phase")

        # Validate phase requirements
        validation_result = self.validate_phase_requirements(phase, evidence_data)

        # Add evidence
        self.add_phase_evidence(phase, evidence_data)

        # Transition to validating
        if self.get_phase_status(phase) == BetaPhaseStatus.NOT_STARTED:
            self.transition_phase(phase, BetaPhaseStatus.IN_PROGRESS)
        self.transition_phase(phase, BetaPhaseStatus.VALIDATING)

        return validation_result

    def transition_phase(self, phase: BetaCriticalPhase, status: BetaPhaseStatus) -> None:
        """Transition a phase to a new status with validation"""
        # Initialize phase status if not set
        if phase.name not in self._state["phase_statuses"]:
            self._state["phase_statuses"][phase.name] = BetaPhaseStatus.NOT_STARTED.value
            if phase == BetaCriticalPhase.ONBOARDING:
                self._state["current_phase"] = phase
                self._save_state()

        # Get current status
        current_status = BetaPhaseStatus(self._state["phase_statuses"][phase.name])

        # Special case: When transitioning to NOT_STARTED for a new phase
        if status == BetaPhaseStatus.NOT_STARTED:
            if phase != self._state["current_phase"]:
                self._state["current_phase"] = phase
                self._state["phase_statuses"][phase.name] = status.value
                self._save_state()
            return

        # Validate phase order
        if phase != self._state["current_phase"]:
            # Allow transitioning to next phase only if previous phase is completed
            phase_order = [
                BetaCriticalPhase.ONBOARDING,
                BetaCriticalPhase.CORE_FEATURES,
                BetaCriticalPhase.DATA_SAFETY,
                BetaCriticalPhase.USER_EXPERIENCE
            ]
            current_idx = phase_order.index(self._state["current_phase"])
            phase_idx = phase_order.index(phase)

            if phase_idx > current_idx + 1:
                raise ValidationError(f"Cannot transition to phase {phase} - must complete earlier phases first")
            elif phase_idx == current_idx + 1:
                # Check if current phase is completed
                current_phase_status = self.get_phase_status(self._state["current_phase"])
                if current_phase_status != BetaPhaseStatus.COMPLETED:
                    raise ValidationError(f"Cannot transition to phase {phase} - current phase {self._state['current_phase']} is not completed")

        # Define valid transitions
        valid_transitions = {
            BetaPhaseStatus.NOT_STARTED: [BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.IN_PROGRESS: [BetaPhaseStatus.VALIDATING, BetaPhaseStatus.BLOCKED],
            BetaPhaseStatus.VALIDATING: [BetaPhaseStatus.COMPLETED, BetaPhaseStatus.FAILED, BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.BLOCKED: [BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.FAILED: [BetaPhaseStatus.IN_PROGRESS],
            BetaPhaseStatus.COMPLETED: [BetaPhaseStatus.IN_PROGRESS]
        }

        # Validate transition
        if status not in valid_transitions.get(current_status, []):
            raise ValidationError(f"Invalid transition from {current_status} to {status}")

        # Update phase status
        self._state["phase_statuses"][phase.name] = status.value
        self._save_state()

    def validate_phase_requirements(self, phase: BetaCriticalPhase, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate phase requirements with evidence"""
        # Validate code coverage first
        if "code_coverage" in evidence_data:
            coverage = evidence_data.get("code_coverage", 0)
            if coverage < 80:
                raise ValidationError(f"Insufficient code coverage: {coverage}% < 80%")

        # Get required fields based on phase
        required_fields = ["code_coverage"]
        if phase == BetaCriticalPhase.DATA_SAFETY:
            required_fields.append("test_results")

        # Then validate other requirements
        missing_fields = [field for field in required_fields if field not in evidence_data]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")

        return {
            "status": "success",
            "phase": phase.name,
            "evidence": evidence_data,
            "timestamp": datetime.now(tz.utc).isoformat()
        }

    def add_phase_evidence(self, phase: BetaCriticalPhase, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add evidence for a phase"""
        # Validate phase can have evidence added
        if phase != self._state["current_phase"]:
            raise ValidationError(f"Cannot add evidence for phase {phase} - not current phase")
            
        current_status = self.get_phase_status(phase)
        if current_status not in [BetaPhaseStatus.IN_PROGRESS, BetaPhaseStatus.FAILED]:
            raise ValidationError(f"Cannot add evidence for phase {phase} in status {current_status}")
            
        # Validate phase requirements
        self.validate_phase_requirements(phase, evidence_data)
        
        # Collect evidence
        evidence_result = self.evidence.collect_validation_evidence({
            "phase": phase.name,
            "status": "verified",
            "data": evidence_data
        })
        
        # Update phase status
        self.transition_phase(phase, BetaPhaseStatus.VALIDATING)
        
        return {
            "status": "success",
            "evidence_id": evidence_result["validation_id"],
            "phase": phase.name
        }
        
    def get_phase_status(self, phase: BetaCriticalPhase) -> BetaPhaseStatus:
        """Get current status of a phase"""
        status_value = self._state.get("phase_statuses", {}).get(phase.name, "not_started")
        return BetaPhaseStatus(status_value)
        
    def is_critical_path_complete(self) -> bool:
        """Check if entire critical path is complete"""
        required_phases = [
            BetaCriticalPhase.ONBOARDING,
            BetaCriticalPhase.CORE_FEATURES,
            BetaCriticalPhase.DATA_SAFETY,
            BetaCriticalPhase.USER_EXPERIENCE
        ]
        
        return all(phase in self._state["completed_phases"] for phase in required_phases)

    def _get_next_phase(self, phase: BetaCriticalPhase) -> BetaCriticalPhase:
        """Get the next phase in the sequence"""
        phase_order = [
            BetaCriticalPhase.ONBOARDING,
            BetaCriticalPhase.CORE_FEATURES,
            BetaCriticalPhase.DATA_SAFETY,
            BetaCriticalPhase.USER_EXPERIENCE
        ]
        
        current_idx = phase_order.index(phase)
        if current_idx < len(phase_order) - 1:
            return phase_order[current_idx + 1]
        else:
            return None

    async def initialize_critical_path(self) -> Dict[str, Any]:
        """Initialize the critical path with validation"""
        try:
            # Initialize with first phase
            first_phase = BetaCriticalPhase.ONBOARDING
            
            # Initialize phase statuses if not present
            if "phase_statuses" not in self._state:
                self._state["phase_statuses"] = {}
            
            # Set initial status for all phases
            for phase in BetaCriticalPhase:
                if phase.name not in self._state["phase_statuses"]:
                    self._state["phase_statuses"][phase.name] = BetaPhaseStatus.NOT_STARTED.value
            
            # Set first phase to IN_PROGRESS
            self._state["phase_statuses"][first_phase.name] = BetaPhaseStatus.IN_PROGRESS.value
            
            # Update current phase and timestamp
            self._state["current_phase"] = first_phase
            self._state["timestamp"] = datetime.utcnow().isoformat()
            
            # Initialize completed phases if not present
            if "completed_phases" not in self._state:
                self._state["completed_phases"] = []
            
            # Save state
            self._save_state()
            
            # Return initialization result
            return {
                "success": True,
                "phases": self._state["phase_statuses"],
                "current_phase": first_phase.name,
                "status": BetaPhaseStatus.IN_PROGRESS.value
            }
            
        except Exception as e:
            self.logger.error(f"Failed to initialize critical path: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_critical_path_status(self) -> Dict[str, Any]:
        """Get current status of the critical path"""
        try:
            # Get current phase
            current_phase = self._state["current_phase"]
            if isinstance(current_phase, str):
                current_phase = BetaCriticalPhase[current_phase]
            
            # Get status of all phases
            phases = {}
            for phase in BetaCriticalPhase:
                status = await self._get_phase_status(phase)
                phases[phase.name] = {
                    "status": status.value,
                    "start_time": self._state.get("phase_times", {}).get(phase.name, {}).get("start"),
                    "end_time": self._state.get("phase_times", {}).get(phase.name, {}).get("end"),
                    "validation_status": self._state.get("phase_validations", {}).get(phase.name, "pending"),
                    "completed_validations": self._state.get("phase_evidence", {}).get(phase.name, []),
                    "issues": self._state.get("phase_issues", {}).get(phase.name, [])
                }
            
            return {
                "success": True,
                "phases": phases,
                "current_phase": current_phase.name,
                "timestamp": datetime.now(tz.utc).isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get critical path status: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def validate_phase_progression(self, phase_name: str) -> Dict[str, Any]:
        """Validate if a phase can progress"""
        try:
            # Convert phase name to enum if needed
            try:
                phase = BetaCriticalPhase[phase_name]
            except KeyError:
                return {
                    "can_progress": False,
                    "error": f"Invalid phase name: {phase_name}"
                }
            
            # Get current phase status
            status = await self._get_phase_status(phase)
            
            # Check if phase can progress
            can_progress = status in [BetaPhaseStatus.IN_PROGRESS, BetaPhaseStatus.FAILED]
            
            # Get validation results
            validation_results = {}
            if can_progress:
                # Validate requirements
                try:
                    evidence_data = self._state.get("phase_evidence", {}).get(phase_name, {})
                    validation_results = await self.validate_phase_requirements(phase, evidence_data)
                except ValidationError as e:
                    validation_results = {
                        "status": "failed",
                        "error": str(e)
                    }
            
            # Get duration status
            duration_status = await self._validate_phase_duration(phase)
            
            # Get evidence
            evidence = self._state.get("phase_evidence", {}).get(phase_name, [])
            
            # Get critical path status
            critical_path_status = await self.get_critical_path_status()
            
            return {
                "can_progress": can_progress and validation_results.get("status") == "success",
                "validation_results": validation_results,
                "critical_path_status": critical_path_status,
                "duration_status": duration_status,
                "evidence": evidence
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate phase progression: {str(e)}")
            return {
                "can_progress": False,
                "error": str(e)
            }

    async def _validate_phase_duration(self, phase: BetaCriticalPhase) -> Dict[str, Any]:
        """Validate phase duration"""
        try:
            # Get phase times
            phase_times = self._state.get("phase_times", {}).get(phase.name, {})
            start_time = phase_times.get("start")
            
            if not start_time:
                return {
                    "valid": False,
                    "current_duration": 0,
                    "required_duration": self.settings.PHASE_DURATIONS.get(phase.name, 0),
                    "error": "Phase has not started"
                }
                
            # Parse start time
            start_dt = datetime.fromisoformat(start_time)
            current_dt = datetime.now(tz.utc)
            
            # Calculate duration in hours
            duration = (current_dt - start_dt).total_seconds() / 3600
            required_duration = self.settings.PHASE_DURATIONS.get(phase.name, 0)
            
            return {
                "valid": duration >= required_duration,
                "current_duration": duration,
                "required_duration": required_duration
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate phase duration: {str(e)}")
            return {
                "valid": False,
                "current_duration": 0,
                "required_duration": 0,
                "error": str(e)
            }

    async def _initialize_phase_validations(self, phase: BetaCriticalPhase) -> None:
        """Initialize phase validations"""
        try:
            # Get phase requirements
            phase_name = phase.name
            beta_phase = self.phase_mapping.get(phase_name)
            if not beta_phase:
                raise ValidationError(f"No beta phase mapping for {phase_name}")
                
            phase_config = self.settings.get_phase_config(beta_phase)
            if not phase_config:
                raise ValidationError(f"No configuration for phase {beta_phase}")
                
            requirements = phase_config.get("required_validations", [])
            
            # Initialize validation data structure
            if "phase_data" not in self._state:
                self._state["phase_data"] = {}
            
            if phase_name not in self._state["phase_data"]:
                self._state["phase_data"][phase_name] = {}
            
            # Initialize validations
            validations = []
            for req in requirements:
                validations.append({
                    "requirement": req,
                    "status": "pending",
                    "timestamp": datetime.now(tz.utc).isoformat()
                })
            
            self._state["phase_data"][phase_name]["validations"] = validations
            self._save_state()
            
        except Exception as e:
            self.logger.error(f"Failed to initialize phase validations: {str(e)}")
            raise ValidationError(f"Failed to initialize phase validations: {str(e)}")

    async def validate_phase_requirements(self, phase: BetaCriticalPhase, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate phase requirements against provided evidence"""
        try:
            phase_name = phase.name
            beta_phase = self.phase_mapping.get(phase_name)
            if not beta_phase:
                raise ValidationError(f"No beta phase mapping for {phase_name}")
            
            # Get phase configuration
            phase_config = self.settings.get_phase_config(beta_phase)
            if not phase_config:
                raise ValidationError(f"No configuration for phase {beta_phase}")
            
            # Get required validations
            required_validations = phase_config.get("required_validations", [])
            if not required_validations:
                return {"status": "success", "message": "No validations required"}
            
            # Get current validations
            current_validations = self._state.get("phase_data", {}).get(phase_name, {}).get("validations", [])
            
            # Check each requirement
            validation_results = []
            all_passed = True
            
            for req in required_validations:
                # Check if requirement has evidence
                req_evidence = evidence_data.get(req, {})
                validation_status = "failed"
                validation_message = ""
                
                if req_evidence:
                    # Validate evidence based on requirement type
                    try:
                        is_valid = await self._validate_evidence(req, req_evidence)
                        validation_status = "success" if is_valid else "failed"
                        validation_message = "Evidence validated successfully" if is_valid else "Evidence validation failed"
                    except Exception as e:
                        validation_status = "failed"
                        validation_message = str(e)
                else:
                    validation_status = "pending"
                    validation_message = "No evidence provided"
                
                validation_results.append({
                    "requirement": req,
                    "status": validation_status,
                    "message": validation_message,
                    "timestamp": datetime.now(tz.utc).isoformat()
                })
                
                if validation_status != "success":
                    all_passed = False
            
            # Update state with latest validation results
            if "phase_data" not in self._state:
                self._state["phase_data"] = {}
            
            if phase_name not in self._state["phase_data"]:
                self._state["phase_data"][phase_name] = {}
            
            self._state["phase_data"][phase_name]["validations"] = validation_results
            self._save_state()
            
            return {
                "status": "success" if all_passed else "failed",
                "validations": validation_results,
                "message": "All validations passed" if all_passed else "Some validations failed or pending"
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate phase requirements: {str(e)}")
            return {
                "status": "failed",
                "error": str(e)
            }

    async def _validate_evidence(self, requirement: str, evidence: Dict[str, Any]) -> bool:
        """Validate specific evidence based on requirement type"""
        try:
            # Get requirement configuration
            req_config = self.settings.get_requirement_config(requirement)
            if not req_config:
                raise ValidationError(f"No configuration for requirement {requirement}")
            
            # Get validation type
            validation_type = req_config.get("validation_type")
            if not validation_type:
                raise ValidationError(f"No validation type specified for requirement {requirement}")
            
            # Validate based on type
            if validation_type == "document":
                return await self._validate_document_evidence(evidence, req_config)
            elif validation_type == "metric":
                return await self._validate_metric_evidence(evidence, req_config)
            elif validation_type == "checklist":
                return await self._validate_checklist_evidence(evidence, req_config)
            else:
                raise ValidationError(f"Unknown validation type: {validation_type}")
                
        except Exception as e:
            self.logger.error(f"Failed to validate evidence: {str(e)}")
            raise ValidationError(f"Evidence validation failed: {str(e)}")

    async def _validate_document_evidence(self, evidence: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Validate document evidence"""
        try:
            # Check required fields
            required_fields = ["file_path", "file_type", "upload_date"]
            for field in required_fields:
                if field not in evidence:
                    raise ValidationError(f"Missing required field: {field}")
            
            # Validate file exists
            file_path = evidence["file_path"]
            if not os.path.exists(file_path):
                raise ValidationError(f"Document file not found: {file_path}")
            
            # Validate file type
            allowed_types = config.get("allowed_file_types", [])
            if allowed_types and evidence["file_type"] not in allowed_types:
                raise ValidationError(f"Invalid file type: {evidence['file_type']}")
            
            # Validate upload date
            upload_date = datetime.fromisoformat(evidence["upload_date"])
            if upload_date > datetime.now(tz.utc):
                raise ValidationError("Upload date cannot be in the future")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Document validation failed: {str(e)}")
            raise ValidationError(f"Document validation failed: {str(e)}")

    async def _validate_metric_evidence(self, evidence: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Validate metric evidence"""
        try:
            # Check required fields
            required_fields = ["metric_name", "value", "timestamp"]
            for field in required_fields:
                if field not in evidence:
                    raise ValidationError(f"Missing required field: {field}")
            
            # Get metric thresholds
            min_value = config.get("min_value")
            max_value = config.get("max_value")
            
            # Validate value
            value = float(evidence["value"])
            if min_value is not None and value < min_value:
                raise ValidationError(f"Value {value} is below minimum threshold {min_value}")
            if max_value is not None and value > max_value:
                raise ValidationError(f"Value {value} is above maximum threshold {max_value}")
            
            # Validate timestamp
            timestamp = datetime.fromisoformat(evidence["timestamp"])
            if timestamp > datetime.now(tz.utc):
                raise ValidationError("Timestamp cannot be in the future")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Metric validation failed: {str(e)}")
            raise ValidationError(f"Metric validation failed: {str(e)}")

    async def _validate_checklist_evidence(self, evidence: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Validate checklist evidence"""
        try:
            # Check required fields
            required_fields = ["items", "completed_by", "completion_date"]
            for field in required_fields:
                if field not in evidence:
                    raise ValidationError(f"Missing required field: {field}")
            
            # Get required items
            required_items = config.get("required_items", [])
            if not required_items:
                raise ValidationError("No required items specified in configuration")
            
            # Validate all required items are present and completed
            completed_items = evidence["items"]
            for item in required_items:
                if item not in completed_items:
                    raise ValidationError(f"Missing required checklist item: {item}")
                if not completed_items[item].get("completed", False):
                    raise ValidationError(f"Required item not completed: {item}")
            
            # Validate completion date
            completion_date = datetime.fromisoformat(evidence["completion_date"])
            if completion_date > datetime.now(tz.utc):
                raise ValidationError("Completion date cannot be in the future")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Checklist validation failed: {str(e)}")
            raise ValidationError(f"Checklist validation failed: {str(e)}")

    async def advance_phase(self, phase: BetaCriticalPhase) -> Dict[str, Any]:
        """Advance the current phase to the next phase if all requirements are met"""
        try:
            # Validate current phase can progress
            validation_result = await self.validate_phase_progression(phase.name)
            if not validation_result.get("can_progress", False):
                return {
                    "success": False,
                    "error": "Phase cannot progress. Check validation results.",
                    "validation_result": validation_result
                }
            
            # Get next phase
            current_idx = list(BetaCriticalPhase).index(phase)
            if current_idx >= len(BetaCriticalPhase) - 1:
                return {
                    "success": False,
                    "error": "Already at final phase"
                }
            
            next_phase = list(BetaCriticalPhase)[current_idx + 1]
            
            # Update phase times
            phase_times = self._state.get("phase_times", {})
            if phase.name not in phase_times:
                phase_times[phase.name] = {}
            
            # Set end time for current phase
            phase_times[phase.name]["end"] = datetime.now(tz.utc).isoformat()
            
            # Initialize next phase
            if next_phase.name not in phase_times:
                phase_times[next_phase.name] = {}
            phase_times[next_phase.name]["start"] = datetime.now(tz.utc).isoformat()
            
            # Update phase statuses
            phase_statuses = self._state.get("phase_statuses", {})
            phase_statuses[phase.name] = BetaPhaseStatus.COMPLETED.value
            phase_statuses[next_phase.name] = BetaPhaseStatus.IN_PROGRESS.value
            
            # Initialize validations for next phase
            await self._initialize_phase_validations(next_phase)
            
            # Save state
            self._state["phase_times"] = phase_times
            self._state["phase_statuses"] = phase_statuses
            self._state["current_phase"] = next_phase.name
            self._save_state()
            
            # Notify stakeholders
            await self.notify_phase_transition(phase, next_phase)
            
            return {
                "success": True,
                "previous_phase": phase.name,
                "current_phase": next_phase.name,
                "transition_time": datetime.now(tz.utc).isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to advance phase: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def revert_phase(self, phase: BetaCriticalPhase) -> Dict[str, Any]:
        """Revert to the previous phase if necessary"""
        try:
            # Get previous phase
            current_idx = list(BetaCriticalPhase).index(phase)
            if current_idx <= 0:
                return {
                    "success": False,
                    "error": "Already at first phase"
                }
            
            previous_phase = list(BetaCriticalPhase)[current_idx - 1]
            
            # Update phase times
            phase_times = self._state.get("phase_times", {})
            if phase.name not in phase_times:
                phase_times[phase.name] = {}
            
            # Set end time for current phase
            phase_times[phase.name]["end"] = datetime.now(tz.utc).isoformat()
            
            # Reopen previous phase
            if previous_phase.name not in phase_times:
                phase_times[previous_phase.name] = {}
            phase_times[previous_phase.name]["start"] = datetime.now(tz.utc).isoformat()
            phase_times[previous_phase.name]["end"] = None
            
            # Update phase statuses
            phase_statuses = self._state.get("phase_statuses", {})
            phase_statuses[phase.name] = BetaPhaseStatus.FAILED.value
            phase_statuses[previous_phase.name] = BetaPhaseStatus.IN_PROGRESS.value
            
            # Reset validations for previous phase
            await self._initialize_phase_validations(previous_phase)
            
            # Save state
            self._state["phase_times"] = phase_times
            self._state["phase_statuses"] = phase_statuses
            self._state["current_phase"] = previous_phase.name
            self._save_state()
            
            # Notify stakeholders
            await self.notify_phase_transition(phase, previous_phase)
            
            return {
                "success": True,
                "previous_phase": phase.name,
                "current_phase": previous_phase.name,
                "transition_time": datetime.now(tz.utc).isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to revert phase: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_phase_history(self, phase: BetaCriticalPhase) -> Dict[str, Any]:
        """Get the history of a specific phase"""
        try:
            phase_name = phase.name
            
            # Get phase times
            phase_times = self._state.get("phase_times", {}).get(phase_name, {})
            start_time = phase_times.get("start")
            end_time = phase_times.get("end")
            
            # Get phase status
            status = self._state.get("phase_statuses", {}).get(phase_name)
            
            # Get validation history
            validations = self._state.get("phase_data", {}).get(phase_name, {}).get("validations", [])
            
            # Get evidence
            evidence = self._state.get("phase_evidence", {}).get(phase_name, [])
            
            return {
                "phase": phase_name,
                "start_time": start_time,
                "end_time": end_time,
                "status": status,
                "validations": validations,
                "evidence": evidence,
                "duration": self._calculate_phase_duration(start_time, end_time)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase history: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _calculate_phase_duration(self, start_time: Optional[str], end_time: Optional[str]) -> Optional[float]:
        """Calculate the duration of a phase in hours"""
        try:
            if not start_time:
                return None
                
            start_dt = datetime.fromisoformat(start_time)
            end_dt = datetime.fromisoformat(end_time) if end_time else datetime.now(tz.utc)
            
            duration = (end_dt - start_dt).total_seconds() / 3600
            return round(duration, 2)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate phase duration: {str(e)}")
            return None

    async def submit_evidence(self, phase: BetaCriticalPhase, evidence_type: str, evidence_data: Dict[str, Any], submitted_by: str) -> None:
        """Submit evidence for a phase"""
        try:
            # Validate phase
            if not self.is_valid_phase(phase):
                raise ValidationError(f"Invalid phase: {phase}")

            # Validate evidence type
            if not self.is_valid_evidence_type(phase, evidence_type):
                raise ValidationError(f"Invalid evidence type for phase {phase}: {evidence_type}")

            # Store evidence
            await self.evidence.store_evidence(phase, evidence_type, evidence_data)

            # Generate evidence details
            evidence_details = self._format_evidence_details(evidence_data)

            # Notify stakeholders
            await self._notify_stakeholders("evidence_submitted", {
                "phase_name": phase.value,
                "evidence_type": evidence_type,
                "status": "Submitted",
                "submitted_by": submitted_by,
                "timestamp": datetime.now(tz.utc).isoformat(),
                "evidence_details": evidence_details
            })

            # Check if phase is complete
            if await self.is_phase_complete(phase):
                duration = await self._calculate_phase_duration(phase)
                summary = await self._generate_phase_summary(phase)
                
                # Notify phase completion
                await self._notify_stakeholders("phase_completion", {
                    "phase_name": phase.value,
                    "duration": duration,
                    "timestamp": datetime.now(tz.utc).isoformat(),
                    "summary": summary
                })

                # Check if entire critical path is complete
                if await self.is_critical_path_complete():
                    await self._notify_critical_path_completion()

        except Exception as e:
            self.logger.error(f"Failed to submit evidence: {str(e)}")
            raise

    async def _calculate_phase_duration(self, phase: BetaCriticalPhase) -> str:
        """Calculate the duration of a phase"""
        try:
            phase_data = await self.evidence.get_phase_data(phase)
            if not phase_data:
                return "Duration unknown"

            start_time = datetime.fromisoformat(phase_data.get("start_time", ""))
            end_time = datetime.now(tz.utc)
            duration = end_time - start_time

            # Format duration
            days = duration.days
            hours = duration.seconds // 3600
            minutes = (duration.seconds % 3600) // 60

            if days > 0:
                return f"{days} days, {hours} hours"
            elif hours > 0:
                return f"{hours} hours, {minutes} minutes"
            else:
                return f"{minutes} minutes"

        except Exception as e:
            self.logger.error(f"Failed to calculate phase duration: {str(e)}")
            return "Duration unknown"

    async def _generate_phase_summary(self, phase: BetaCriticalPhase) -> str:
        """Generate a summary of phase completion"""
        try:
            evidence_items = await self.evidence.get_phase_evidence(phase)
            if not evidence_items:
                return "No evidence collected"

            summary = []
            for evidence_type, data in evidence_items.items():
                summary.append(f"- {evidence_type}: {len(data)} items")
                
                # Add key metrics if available
                metrics = data.get("metrics", {})
                if metrics:
                    for metric, value in metrics.items():
                        summary.append(f"  • {metric}: {value}")

            return "\n".join(summary)

        except Exception as e:
            self.logger.error(f"Failed to generate phase summary: {str(e)}")
            return "Summary generation failed"

    async def _notify_critical_path_completion(self) -> None:
        """Notify stakeholders of critical path completion"""
        try:
            # Calculate total duration
            start_time = await self._get_critical_path_start_time()
            if not start_time:
                duration = "Duration unknown"
            else:
                duration = self._format_duration(
                    datetime.now(tz.utc) - datetime.fromisoformat(start_time)
                )

            # Generate phase summaries
            phase_summary = await self._generate_critical_path_summary()
            status_summary = await self._generate_status_summary()

            # Notify stakeholders
            await self._notify_stakeholders("critical_path_completion", {
                "duration": duration,
                "timestamp": datetime.now(tz.utc).isoformat(),
                "phase_summary": phase_summary,
                "status_summary": status_summary
            })

        except Exception as e:
            self.logger.error(f"Failed to notify critical path completion: {str(e)}")
            raise

    def _format_duration(self, duration: timedelta) -> str:
        """Format a duration into a readable string"""
        days = duration.days
        hours = duration.seconds // 3600
        minutes = (duration.seconds % 3600) // 60

        parts = []
        if days > 0:
            parts.append(f"{days} days")
        if hours > 0:
            parts.append(f"{hours} hours")
        if minutes > 0:
            parts.append(f"{minutes} minutes")

        return ", ".join(parts) if parts else "0 minutes"

    async def _get_critical_path_start_time(self) -> Optional[str]:
        """Get the start time of the critical path"""
        try:
            # Get the first phase's start time
            first_phase = BetaCriticalPhase.PLANNING
            phase_data = await self.evidence.get_phase_data(first_phase)
            return phase_data.get("start_time", "") if phase_data else None

        except Exception as e:
            self.logger.error(f"Failed to get critical path start time: {str(e)}")
            return None

    async def _generate_critical_path_summary(self) -> str:
        """Generate a summary of all phases"""
        try:
            summary = []
            for phase in BetaCriticalPhase:
                phase_data = await self.evidence.get_phase_data(phase)
                if not phase_data:
                    continue

                duration = self._format_duration(
                    datetime.fromisoformat(phase_data.get("end_time", "")) -
                    datetime.fromisoformat(phase_data.get("start_time", ""))
                )

                evidence_count = len(await self.evidence.get_phase_evidence(phase))
                summary.append(f"Phase: {phase.value}")
                summary.append(f"- Duration: {duration}")
                summary.append(f"- Evidence Items: {evidence_count}")
                summary.append("")

            return "\n".join(summary)

        except Exception as e:
            self.logger.error(f"Failed to generate critical path summary: {str(e)}")
            return "Summary generation failed"

    async def _generate_status_summary(self) -> str:
        """Generate overall status summary"""
        try:
            total_evidence = 0
            validation_failures = 0
            stakeholder_updates = 0

            for phase in BetaCriticalPhase:
                phase_data = await self.evidence.get_phase_data(phase)
                if not phase_data:
                    continue

                total_evidence += len(await self.evidence.get_phase_evidence(phase))
                validation_failures += phase_data.get("validation_failures", 0)
                stakeholder_updates += phase_data.get("stakeholder_updates", 0)

            return f"""
Overall Metrics:
- Total Evidence Items: {total_evidence}
- Validation Failures: {validation_failures}
- Stakeholder Updates: {stakeholder_updates}
"""

        except Exception as e:
            self.logger.error(f"Failed to generate status summary: {str(e)}")
            return "Status summary generation failed"

    def _format_evidence_details(self, evidence_data: Dict[str, Any]) -> str:
        """Format evidence details for notifications"""
        try:
            details = []
            for key, value in evidence_data.items():
                if isinstance(value, dict):
                    details.append(f"{key}:")
                    for k, v in value.items():
                        details.append(f"  - {k}: {v}")
                else:
                    details.append(f"{key}: {value}")

            return "\n".join(details)

        except Exception as e:
            self.logger.error(f"Failed to format evidence details: {str(e)}")
            return "Evidence details formatting failed"
