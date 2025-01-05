"""
Beta Testing Dashboard
Streamlined dashboard for managing beta testing progress
Last Updated: 2024-12-30T22:13:56+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import logging
import json
import os
from pathlib import Path

from .beta_critical_path_orchestrator import BetaCriticalPathOrchestrator, BetaPhaseStatus
from .beta_validation_evidence import BetaValidationEvidence
from .settings import settings

class BetaDashboard:
    """
    Streamlined dashboard for beta testing management
    Focuses on essential metrics and easy administration
    """
    
    def __init__(self):
        self.orchestrator = BetaCriticalPathOrchestrator()
        self.evidence_collector = BetaValidationEvidence()
        self.logger = logging.getLogger(__name__)
        self._cache = {}
        self._cache_lock = asyncio.Lock()
        
    async def get_dashboard_summary(self) -> Dict:
        """Get a high-level summary of beta testing progress"""
        try:
            # Get critical path status
            status = await self.orchestrator.get_critical_path_status()
            
            if not status["success"]:
                return {
                    "success": False,
                    "error": "Failed to get status"
                }
                
            current_phase = status["current_phase"]
            phases = status["phases"]
            
            # Calculate progress
            completed_phases = sum(
                1 for p in phases.values()
                if p["status"] == BetaPhaseStatus.COMPLETED.value
            )
            total_phases = len(phases)
            progress = (completed_phases / total_phases) * 100
            
            # Get active issues
            issues = await self._get_active_issues(current_phase)
            
            # Get tester metrics
            tester_metrics = await self._get_tester_metrics(current_phase)
            
            return {
                "success": True,
                "current_phase": current_phase,
                "progress": progress,
                "active_issues": len(issues),
                "active_testers": tester_metrics["active_testers"],
                "recent_feedback": tester_metrics["recent_feedback"],
                "next_actions": await self._get_next_actions(current_phase)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get dashboard summary: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get summary",
                "details": str(e)
            }
            
    async def get_phase_details(self, phase: str) -> Dict:
        """Get detailed information about a specific phase"""
        try:
            # Get phase status
            status = await self.orchestrator.get_critical_path_status()
            
            if not status["success"] or phase not in status["phases"]:
                return {
                    "success": False,
                    "error": "Invalid phase"
                }
                
            phase_status = status["phases"][phase]
            
            # Get validation results
            validation = await self.orchestrator.validate_phase_progression(phase)
            
            # Get tester feedback
            feedback = await self._get_phase_feedback(phase)
            
            return {
                "success": True,
                "status": phase_status,
                "validation": validation,
                "feedback": feedback,
                "can_progress": validation["can_progress"] if "can_progress" in validation else False
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get phase details: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get details",
                "details": str(e)
            }
            
    async def get_tester_overview(self) -> Dict:
        """Get overview of beta tester activity"""
        try:
            status = await self.orchestrator.get_critical_path_status()
            current_phase = status["current_phase"]
            
            # Get tester metrics
            metrics = await self._get_tester_metrics(current_phase)
            
            return {
                "success": True,
                "active_testers": metrics["active_testers"],
                "feedback_summary": metrics["feedback_summary"],
                "top_issues": metrics["top_issues"],
                "recent_activity": metrics["recent_activity"]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get tester overview: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get overview",
                "details": str(e)
            }
            
    async def get_action_items(self) -> Dict:
        """Get list of pending action items"""
        try:
            status = await self.orchestrator.get_critical_path_status()
            current_phase = status["current_phase"]
            
            # Get validation status
            validation = await self.orchestrator.validate_phase_progression(current_phase)
            
            # Get active issues
            issues = await self._get_active_issues(current_phase)
            
            # Generate action items
            actions = []
            
            # Add validation-based actions
            if not validation.get("can_progress", False):
                for req, result in validation.get("validation_results", {}).items():
                    if not result.get("valid", False):
                        actions.append({
                            "type": "validation",
                            "priority": "high",
                            "description": f"Address validation failure: {req}",
                            "details": result
                        })
                        
            # Add issue-based actions
            for issue in issues:
                actions.append({
                    "type": "issue",
                    "priority": "medium",
                    "description": f"Resolve issue: {issue['summary']}",
                    "details": issue
                })
                
            return {
                "success": True,
                "actions": actions,
                "total_actions": len(actions),
                "high_priority": sum(1 for a in actions if a["priority"] == "high")
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get action items: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get actions",
                "details": str(e)
            }
            
    async def _get_active_issues(self, phase: str) -> List[Dict]:
        """Get active issues for a phase"""
        try:
            # Get cached issues if available
            async with self._cache_lock:
                cache_key = f"issues_{phase}"
                if cache_key in self._cache:
                    return self._cache[cache_key]
                    
            # Get evidence files
            evidence_dir = settings.BETA_EVIDENCE_PATH
            issue_files = [
                f for f in os.listdir(evidence_dir)
                if f.startswith(f"issues_{phase}")
            ]
            
            # Get latest issues
            issues = []
            if issue_files:
                latest_file = max(issue_files)
                with open(os.path.join(evidence_dir, latest_file), 'r') as f:
                    data = json.load(f)
                    issues = data.get("issues", [])
                    
            # Cache results
            async with self._cache_lock:
                self._cache[cache_key] = issues
                
            return issues
            
        except Exception as e:
            self.logger.error(f"Failed to get active issues: {str(e)}")
            return []
            
    async def _get_tester_metrics(self, phase: str) -> Dict:
        """Get metrics about beta tester activity"""
        try:
            # In a real implementation, this would fetch from a database
            # For now, return sample data
            return {
                "active_testers": 10,  # Number of active testers
                "recent_feedback": 5,   # Recent feedback items
                "feedback_summary": {
                    "bugs": 3,
                    "features": 2,
                    "usability": 4
                },
                "top_issues": [
                    "Performance on mobile",
                    "Notification delays"
                ],
                "recent_activity": [
                    {
                        "type": "feedback",
                        "summary": "New medication form feedback",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get tester metrics: {str(e)}")
            return {
                "active_testers": 0,
                "recent_feedback": 0,
                "feedback_summary": {},
                "top_issues": [],
                "recent_activity": []
            }
            
    async def _get_phase_feedback(self, phase: str) -> List[Dict]:
        """Get feedback for a specific phase"""
        try:
            # In a real implementation, this would fetch from a database
            # For now, return sample data
            return [
                {
                    "type": "feature",
                    "summary": "Medication reminder improvements",
                    "details": "Suggestions for reminder customization",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
            
        except Exception as e:
            self.logger.error(f"Failed to get phase feedback: {str(e)}")
            return []
            
    async def _get_next_actions(self, phase: str) -> List[str]:
        """Get list of recommended next actions"""
        try:
            validation = await self.orchestrator.validate_phase_progression(phase)
            actions = []
            
            if validation.get("can_progress", False):
                actions.append("Ready to progress to next phase")
            else:
                if "validation_results" in validation:
                    for req, result in validation["validation_results"].items():
                        if not result.get("valid", False):
                            actions.append(f"Address {req} validation")
                            
            return actions
            
        except Exception as e:
            self.logger.error(f"Failed to get next actions: {str(e)}")
            return []
