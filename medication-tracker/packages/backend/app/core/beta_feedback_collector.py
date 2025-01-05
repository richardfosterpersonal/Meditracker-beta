"""
Beta Feedback Collector
Collects and manages feedback during beta testing
Last Updated: 2024-12-31T15:18:12+01:00
"""

import logging
from datetime import datetime
from typing import Dict, Optional
import json
from pathlib import Path

from .beta_settings import BetaSettings

class BetaFeedbackCollector:
    """Collects and manages beta testing feedback"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.logger = logging.getLogger(__name__)
        self.feedback_path = self.settings.FEEDBACK_PATH
        
    async def collect_feedback(self, phase: str, feedback_type: str, data: Dict) -> Dict:
        """Collect feedback for a phase"""
        try:
            if phase not in self.settings.BETA_PHASES:
                raise ValueError(f"Invalid phase: {phase}")
                
            # Create feedback directory if needed
            phase_path = self.feedback_path / phase
            phase_path.mkdir(parents=True, exist_ok=True)
            
            # Generate feedback ID
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            feedback_id = f"feedback_{feedback_type}_{timestamp}"
            
            # Create feedback record
            feedback = {
                "id": feedback_id,
                "type": feedback_type,
                "phase": phase,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data
            }
            
            # Save feedback
            feedback_file = phase_path / f"{feedback_id}.json"
            with open(feedback_file, "w") as f:
                json.dump(feedback, f, indent=4)
                
            return {
                "success": True,
                "feedback_id": feedback_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect feedback: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    async def get_feedback(
        self,
        phase: Optional[str] = None,
        feedback_type: Optional[str] = None
    ) -> Dict:
        """Get collected feedback"""
        try:
            feedback_items = []
            
            # Get phases to check
            phases = [phase] if phase else self.settings.BETA_PHASES.keys()
            
            # Collect feedback from each phase
            for p in phases:
                phase_path = self.feedback_path / p
                if not phase_path.exists():
                    continue
                    
                # Get feedback files
                feedback_files = list(phase_path.glob("*.json"))
                
                # Load each feedback file
                for feedback_file in feedback_files:
                    try:
                        with open(feedback_file, "r") as f:
                            feedback = json.load(f)
                            
                        # Filter by type if specified
                        if feedback_type and feedback["type"] != feedback_type:
                            continue
                            
                        feedback_items.append(feedback)
                        
                    except Exception as e:
                        self.logger.error(
                            f"Failed to load feedback file {feedback_file}: {str(e)}"
                        )
                        
            return {
                "success": True,
                "feedback": feedback_items,
                "count": len(feedback_items),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get feedback: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    async def analyze_feedback(
        self,
        phase: Optional[str] = None,
        feedback_type: Optional[str] = None
    ) -> Dict:
        """Analyze collected feedback"""
        try:
            # Get feedback
            feedback_result = await self.get_feedback(phase, feedback_type)
            if not feedback_result["success"]:
                return feedback_result
                
            feedback_items = feedback_result["feedback"]
            
            # Initialize analysis
            analysis = {
                "total_items": len(feedback_items),
                "by_phase": {},
                "by_type": {},
                "latest_timestamp": None
            }
            
            # Analyze feedback
            for feedback in feedback_items:
                # Count by phase
                phase = feedback["phase"]
                if phase not in analysis["by_phase"]:
                    analysis["by_phase"][phase] = 0
                analysis["by_phase"][phase] += 1
                
                # Count by type
                f_type = feedback["type"]
                if f_type not in analysis["by_type"]:
                    analysis["by_type"][f_type] = 0
                analysis["by_type"][f_type] += 1
                
                # Track latest timestamp
                timestamp = feedback["timestamp"]
                if (
                    not analysis["latest_timestamp"] or
                    timestamp > analysis["latest_timestamp"]
                ):
                    analysis["latest_timestamp"] = timestamp
                    
            return {
                "success": True,
                "analysis": analysis,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to analyze feedback: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
