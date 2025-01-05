"""
Beta Validation Tracker
Tracks and manages beta testing validation state
"""

from datetime import datetime
from typing import Dict, List, Optional
import json
from pathlib import Path

from app.core.config import settings
from app.core.logging import beta_logger

class BetaValidationTracker:
    """Tracks beta testing validation state"""
    
    def __init__(self):
        self.logger = beta_logger
        self.structure_file = Path(settings.BETA_EVIDENCE_PATH) / "structure.json"
        self._ensure_structure()
    
    def _ensure_structure(self):
        """Ensures validation structure exists"""
        if not self.structure_file.exists():
            self.logger.warning("Beta validation structure not found, creating...")
            self._create_initial_structure()
    
    def _create_initial_structure(self):
        """Creates initial validation structure"""
        structure = {
            "beta_testing": {
                "phases": {
                    phase: {
                        "status": "pending",
                        "start_date": None,
                        "end_date": None,
                        "validations_complete": []
                    }
                    for phase in settings.BETA_PHASES.keys()
                },
                "current_phase": None,
                "last_validation": None
            },
            "components": {
                component: {
                    "status": "initializing",
                    "last_validated": None,
                    "validation_history": []
                }
                for component in [
                    "beta_testing",
                    "beta_onboarding",
                    "beta_monitoring",
                    "beta_feedback"
                ]
            }
        }
        
        self.structure_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.structure_file, 'w') as f:
            json.dump(structure, f, indent=2)
    
    def get_structure(self) -> Dict:
        """Gets current validation structure"""
        with open(self.structure_file, 'r') as f:
            return json.load(f)
    
    def update_component_status(
        self,
        component: str,
        status: str,
        validation_details: Optional[Dict] = None
    ):
        """Updates component validation status"""
        structure = self.get_structure()
        
        if component not in structure["components"]:
            raise ValueError(f"Invalid component: {component}")
        
        structure["components"][component].update({
            "status": status,
            "last_validated": datetime.now().isoformat()
        })
        
        if validation_details:
            structure["components"][component]["validation_history"].append({
                "timestamp": datetime.now().isoformat(),
                "details": validation_details
            })
        
        with open(self.structure_file, 'w') as f:
            json.dump(structure, f, indent=2)
    
    def start_beta_phase(self, phase: str):
        """Starts a beta testing phase"""
        if phase not in settings.BETA_PHASES:
            raise ValueError(f"Invalid phase: {phase}")
        
        structure = self.get_structure()
        
        # Validate phase transition
        current_phase = structure["beta_testing"]["current_phase"]
        if current_phase and structure["beta_testing"]["phases"][current_phase]["status"] != "completed":
            raise ValueError(f"Cannot start {phase} phase: {current_phase} phase not completed")
        
        structure["beta_testing"]["current_phase"] = phase
        structure["beta_testing"]["phases"][phase].update({
            "status": "active",
            "start_date": datetime.now().isoformat(),
            "end_date": None
        })
        
        with open(self.structure_file, 'w') as f:
            json.dump(structure, f, indent=2)
    
    def complete_beta_phase(self, phase: str, validation_results: Dict):
        """Completes a beta testing phase"""
        structure = self.get_structure()
        
        if phase != structure["beta_testing"]["current_phase"]:
            raise ValueError(f"Cannot complete {phase} phase: not current phase")
        
        # Validate required validations
        required = set(settings.BETA_PHASES[phase]["required_validations"])
        completed = set(validation_results.keys())
        
        if not required.issubset(completed):
            missing = required - completed
            raise ValueError(f"Missing required validations: {missing}")
        
        structure["beta_testing"]["phases"][phase].update({
            "status": "completed",
            "end_date": datetime.now().isoformat(),
            "validations_complete": list(completed)
        })
        
        with open(self.structure_file, 'w') as f:
            json.dump(structure, f, indent=2)
    
    def get_current_phase(self) -> Optional[str]:
        """Gets current beta testing phase"""
        structure = self.get_structure()
        return structure["beta_testing"]["current_phase"]
    
    def get_component_status(self, component: str) -> Dict:
        """Gets component validation status"""
        structure = self.get_structure()
        
        if component not in structure["components"]:
            raise ValueError(f"Invalid component: {component}")
        
        return structure["components"][component]
