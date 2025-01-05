"""
Beta Critical Path Monitor
Monitors and validates beta testing critical path
Last Updated: 2024-12-31T15:18:12+01:00
"""

import logging
from datetime import datetime
from typing import Dict, Optional
import json
from pathlib import Path

from .beta_settings import BetaSettings
from .beta_validation_evidence import BetaValidationEvidence

class BetaCriticalPathMonitor:
    """Monitors beta testing critical path"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.evidence = BetaValidationEvidence()
        self.logger = logging.getLogger(__name__)
        
        # Critical path state
        self._state_file = self.settings.BETA_BASE_PATH / "critical_path_monitor.json"
        self._initialize_state()
        
    def _initialize_state(self) -> None:
        """Initialize monitor state"""
        if not self._state_file.exists():
            current_time = datetime.utcnow().isoformat()
            self._state = {
                "start_time": current_time,
                "phases": {
                    phase: {
                        "start_time": None,
                        "last_check": None,
                        "status": "not_started",
                        "issues": []
                    }
                    for phase in self.settings.BETA_PHASES
                }
            }
            self._save_state()
        else:
            with open(self._state_file, "r") as f:
                self._state = json.load(f)
                
    def _save_state(self) -> None:
        """Save monitor state"""
        with open(self._state_file, "w") as f:
            json.dump(self._state, f, indent=4)
            
    async def monitor_critical_path(self, phase: str) -> Dict:
        """Monitor critical path for a phase"""
        try:
            if phase not in self.settings.BETA_PHASES:
                raise ValueError(f"Invalid phase: {phase}")
                
            # Get phase configuration
            phase_config = self.settings.get_phase_config(phase)
            
            # Update phase status
            current_time = datetime.utcnow().isoformat()
            if not self._state["phases"][phase]["start_time"]:
                self._state["phases"][phase]["start_time"] = current_time
                
            self._state["phases"][phase]["last_check"] = current_time
            
            # Verify evidence chain
            evidence_result = await self.evidence.verify_evidence_chain(phase)
            if not evidence_result["valid"]:
                self._state["phases"][phase]["status"] = "evidence_invalid"
                self._state["phases"][phase]["issues"] = evidence_result["issues"]
                self._save_state()
                
                return {
                    "success": False,
                    "error": "Evidence chain verification failed",
                    "details": evidence_result["issues"],
                    "timestamp": current_time
                }
                
            # Update success status
            self._state["phases"][phase]["status"] = "monitored"
            self._state["phases"][phase]["issues"] = []
            self._save_state()
            
            return {
                "success": True,
                "phase": phase,
                "evidence_status": evidence_result,
                "timestamp": current_time
            }
            
        except Exception as e:
            self.logger.error(f"Critical path monitoring failed: {str(e)}")
            if phase in self._state["phases"]:
                self._state["phases"][phase]["status"] = "error"
                self._state["phases"][phase]["issues"] = [str(e)]
                self._save_state()
                
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
