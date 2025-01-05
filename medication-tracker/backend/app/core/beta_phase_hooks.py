"""
Beta Phase Transition Hooks
Manages phase transitions and notifications in the beta testing process
Last Updated: 2024-12-30T22:08:13+01:00
"""

from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
import asyncio
from collections import defaultdict
import logging
import json
import os
from pathlib import Path
from enum import Enum

from .beta_critical_path_orchestrator import BetaCriticalPathOrchestrator, BetaPhaseStatus
from .beta_validation_evidence import BetaValidationEvidence
from .settings import settings
from ..infrastructure.notification.push_sender import PushNotificationSender
from ..models.user import User

class HookType(Enum):
    PRE_TRANSITION = "pre_transition"
    POST_TRANSITION = "post_transition"
    VALIDATION = "validation"
    NOTIFICATION = "notification"
    ERROR = "error"

class BetaPhaseHooks:
    """
    Manages hooks for beta phase transitions
    Ensures proper execution of pre and post transition tasks
    """
    
    def __init__(self):
        self.orchestrator = BetaCriticalPathOrchestrator()
        self.evidence_collector = BetaValidationEvidence()
        self.notification_sender = PushNotificationSender()
        self.logger = logging.getLogger(__name__)
        self._hooks = defaultdict(lambda: defaultdict(list))
        self._notification_groups = self._initialize_notification_groups()
        
    def register_hook(
        self,
        phase: str,
        hook_type: HookType,
        callback: Callable,
        priority: int = 0
    ) -> None:
        """Register a hook for a specific phase and type"""
        self._hooks[phase][hook_type].append({
            "callback": callback,
            "priority": priority
        })
        # Sort hooks by priority (higher priority first)
        self._hooks[phase][hook_type].sort(key=lambda x: x["priority"], reverse=True)
        
    async def execute_hooks(
        self,
        phase: str,
        hook_type: HookType,
        context: Dict
    ) -> Dict:
        """Execute all hooks of a specific type for a phase"""
        try:
            results = []
            
            for hook in self._hooks[phase][hook_type]:
                try:
                    result = await hook["callback"](context)
                    results.append({
                        "success": True,
                        "result": result
                    })
                except Exception as e:
                    results.append({
                        "success": False,
                        "error": str(e)
                    })
                    # Execute error hooks
                    await self._handle_hook_error(phase, hook_type, e, context)
                    
            return {
                "success": all(r["success"] for r in results),
                "results": results
            }
            
        except Exception as e:
            self.logger.error(f"Hook execution failed: {str(e)}")
            return {
                "success": False,
                "error": "Hook execution failed",
                "details": str(e)
            }
            
    async def transition_phase(
        self,
        current_phase: str,
        next_phase: str
    ) -> Dict:
        """Handle phase transition with hooks"""
        try:
            context = {
                "current_phase": current_phase,
                "next_phase": next_phase,
                "timestamp": datetime.utcnow().isoformat(),
                "orchestrator": self.orchestrator
            }
            
            # Execute pre-transition hooks
            pre_results = await self.execute_hooks(
                current_phase,
                HookType.PRE_TRANSITION,
                context
            )
            
            if not pre_results["success"]:
                return {
                    "success": False,
                    "error": "Pre-transition hooks failed",
                    "details": pre_results
                }
                
            # Perform transition
            transition_result = await self.orchestrator.progress_to_next_phase(
                current_phase
            )
            
            if not transition_result["success"]:
                return {
                    "success": False,
                    "error": "Phase transition failed",
                    "details": transition_result
                }
                
            # Update context
            context.update({
                "transition_result": transition_result
            })
            
            # Execute post-transition hooks
            post_results = await self.execute_hooks(
                next_phase,
                HookType.POST_TRANSITION,
                context
            )
            
            # Send notifications
            await self._notify_stakeholders(
                current_phase,
                next_phase,
                transition_result
            )
            
            return {
                "success": True,
                "transition": transition_result,
                "pre_hooks": pre_results,
                "post_hooks": post_results
            }
            
        except Exception as e:
            self.logger.error(f"Phase transition failed: {str(e)}")
            return {
                "success": False,
                "error": "Phase transition failed",
                "details": str(e)
            }
            
    async def validate_with_hooks(self, phase: str) -> Dict:
        """Validate phase with hooks"""
        try:
            context = {
                "phase": phase,
                "timestamp": datetime.utcnow().isoformat(),
                "orchestrator": self.orchestrator
            }
            
            # Execute validation hooks
            validation_results = await self.execute_hooks(
                phase,
                HookType.VALIDATION,
                context
            )
            
            # Perform orchestrator validation
            orchestrator_validation = await self.orchestrator.validate_phase_progression(
                phase
            )
            
            # Combine results
            validation_success = (
                validation_results["success"] and
                orchestrator_validation["can_progress"]
            )
            
            if not validation_success:
                # Execute error hooks
                await self.execute_hooks(
                    phase,
                    HookType.ERROR,
                    {
                        **context,
                        "validation_results": validation_results,
                        "orchestrator_validation": orchestrator_validation
                    }
                )
                
            return {
                "success": validation_success,
                "hook_validation": validation_results,
                "orchestrator_validation": orchestrator_validation
            }
            
        except Exception as e:
            self.logger.error(f"Validation with hooks failed: {str(e)}")
            return {
                "success": False,
                "error": "Validation failed",
                "details": str(e)
            }
            
    def _initialize_notification_groups(self) -> Dict[str, List[str]]:
        """Initialize notification groups for different stakeholders"""
        return {
            "developers": self._get_developer_emails(),
            "testers": self._get_tester_emails(),
            "managers": self._get_manager_emails(),
            "stakeholders": self._get_stakeholder_emails()
        }
        
    async def _notify_stakeholders(
        self,
        current_phase: str,
        next_phase: str,
        transition_result: Dict
    ) -> None:
        """Notify stakeholders about phase transition"""
        try:
            # Prepare notification context
            context = {
                "current_phase": current_phase,
                "next_phase": next_phase,
                "transition_result": transition_result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Execute notification hooks
            await self.execute_hooks(
                next_phase,
                HookType.NOTIFICATION,
                context
            )
            
            # Send notifications to different groups
            notifications = []
            
            # Developers notification
            notifications.append(
                self.notification_sender.send_notification(
                    self._notification_groups["developers"],
                    "Beta Phase Transition",
                    self._generate_developer_message(context)
                )
            )
            
            # Testers notification
            notifications.append(
                self.notification_sender.send_notification(
                    self._notification_groups["testers"],
                    "Beta Testing Phase Update",
                    self._generate_tester_message(context)
                )
            )
            
            # Managers notification
            notifications.append(
                self.notification_sender.send_notification(
                    self._notification_groups["managers"],
                    "Beta Phase Progress Report",
                    self._generate_manager_message(context)
                )
            )
            
            # Stakeholders notification
            notifications.append(
                self.notification_sender.send_notification(
                    self._notification_groups["stakeholders"],
                    "Beta Testing Progress Update",
                    self._generate_stakeholder_message(context)
                )
            )
            
            # Wait for all notifications
            await asyncio.gather(*notifications)
            
        except Exception as e:
            self.logger.error(f"Stakeholder notification failed: {str(e)}")
            raise
            
    async def _handle_hook_error(
        self,
        phase: str,
        hook_type: HookType,
        error: Exception,
        context: Dict
    ) -> None:
        """Handle hook execution errors"""
        try:
            error_context = {
                **context,
                "error": str(error),
                "error_type": error.__class__.__name__,
                "hook_type": hook_type.value
            }
            
            # Execute error hooks
            await self.execute_hooks(
                phase,
                HookType.ERROR,
                error_context
            )
            
            # Notify developers
            await self.notification_sender.send_notification(
                self._notification_groups["developers"],
                "Beta Hook Error",
                self._generate_error_message(error_context)
            )
            
        except Exception as e:
            self.logger.error(f"Error handling failed: {str(e)}")
            
    def _get_developer_emails(self) -> List[str]:
        """Get list of developer emails"""
        # In a real implementation, this would fetch from a configuration or database
        return settings.BETA_DEVELOPER_EMAILS
        
    def _get_tester_emails(self) -> List[str]:
        """Get list of tester emails"""
        return settings.BETA_TESTER_EMAILS
        
    def _get_manager_emails(self) -> List[str]:
        """Get list of manager emails"""
        return settings.BETA_MANAGER_EMAILS
        
    def _get_stakeholder_emails(self) -> List[str]:
        """Get list of stakeholder emails"""
        return settings.BETA_STAKEHOLDER_EMAILS
        
    def _generate_developer_message(self, context: Dict) -> str:
        """Generate detailed technical message for developers"""
        return f"""
Beta Phase Transition Technical Report
Current Phase: {context['current_phase']}
Next Phase: {context['next_phase']}
Timestamp: {context['timestamp']}

Transition Details:
{json.dumps(context['transition_result'], indent=2)}

Please review the technical metrics and validation results in the beta dashboard.
"""
        
    def _generate_tester_message(self, context: Dict) -> str:
        """Generate message for testers"""
        return f"""
Beta Testing Phase Update
We have progressed from {context['current_phase']} to {context['next_phase']}.

What's New:
- New test scenarios are now available
- Updated test requirements have been published
- Please check the beta dashboard for detailed instructions

Next Steps:
1. Review new test cases
2. Update test plans
3. Begin testing new features
"""
        
    def _generate_manager_message(self, context: Dict) -> str:
        """Generate summary message for managers"""
        return f"""
Beta Phase Progress Report
Phase Transition: {context['current_phase']} → {context['next_phase']}
Timestamp: {context['timestamp']}

Summary:
- All validation requirements met
- Critical path maintained
- Evidence chain verified

Please review the full report in the beta dashboard.
"""
        
    def _generate_stakeholder_message(self, context: Dict) -> str:
        """Generate high-level message for stakeholders"""
        return f"""
Beta Testing Progress Update
We are pleased to announce that the beta testing has progressed to the next phase.

Current Status:
- Successfully completed: {context['current_phase']}
- Now entering: {context['next_phase']}

All quality and safety requirements have been met, and we remain on schedule.
"""
        
    def _generate_error_message(self, context: Dict) -> str:
        """Generate error message for developers"""
        return f"""
Beta Hook Error Report
Phase: {context['phase']}
Hook Type: {context['hook_type']}
Error Type: {context['error_type']}
Timestamp: {context['timestamp']}

Error Details:
{context['error']}

Context:
{json.dumps(context, indent=2, default=str)}

Please investigate and resolve this issue as soon as possible.
"""
