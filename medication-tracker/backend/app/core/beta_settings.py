"""
Beta Settings
Configuration settings for beta testing infrastructure
Last Updated: 2025-01-02T12:43:13+01:00
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import json
import logging
from enum import Enum
from ..config import Config

class StakeholderRole(Enum):
    """Stakeholder roles in the beta testing process"""
    BETA_MANAGER = "beta_manager"
    TECHNICAL_LEAD = "technical_lead"
    PRODUCT_OWNER = "product_owner"
    QA_LEAD = "qa_lead"
    SECURITY_OFFICER = "security_officer"
    COMPLIANCE_OFFICER = "compliance_officer"
    DEVELOPER = "developer"
    TESTER = "tester"

class NotificationLevel(Enum):
    """Notification importance levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class StakeholderConfig:
    """Configuration for a stakeholder"""
    def __init__(
        self,
        email: str,
        roles: List[StakeholderRole],
        notification_channels: List[str],
        notification_levels: List[NotificationLevel],
        phases_of_interest: Optional[List[str]] = None
    ):
        self.email = email
        self.roles = roles
        self.notification_channels = notification_channels
        self.notification_levels = notification_levels
        self.phases_of_interest = phases_of_interest or []

class BetaSettings:
    """Beta testing configuration settings"""
    
    def __init__(self):
        """Initialize beta settings"""
        self.logger = logging.getLogger(__name__)
        
        # Version information
        self.VERSION = "1.0.0"
        
        # Use main app database
        self.DATABASE_URL = Config.SQLALCHEMY_DATABASE_URI
        self.SQLALCHEMY_DATABASE_URI = self.DATABASE_URL
        
        # Base paths
        self.BASE_PATH = Path(os.getenv("BETA_BASE_PATH", "data/beta"))
        self.EVIDENCE_PATH = self.BASE_PATH / "evidence"
        self.LOGS_PATH = self.BASE_PATH / "logs"
        self.FEEDBACK_PATH = self.BASE_PATH / "feedback"
        self.DATA_PATH = self.BASE_PATH / "data"
        self.MONITORING_PATH = self.BASE_PATH / "monitoring"
        
        # Beta paths
        self.BETA_EVIDENCE_PATH = self.EVIDENCE_PATH / "beta"
        self.BETA_LOGS_PATH = self.LOGS_PATH / "beta"
        self.BETA_FEEDBACK_PATH = self.FEEDBACK_PATH / "beta"
        self.BETA_DATA_PATH = self.DATA_PATH / "beta"
        self.BETA_MONITORING_PATH = self.MONITORING_PATH / "beta"
        
        # Create directories
        self._create_directories()
        
        # Beta phases
        self.BETA_PHASES = [
            "internal",   # Internal testing
            "limited",    # Limited external testing
            "open"        # Open beta testing
        ]
        
        # Phase requirements
        self.PHASE_REQUIREMENTS = {
            "internal": {
                "min_duration_days": 14,
                "max_duration_days": 30,
                "min_users": 10,
                "max_users": 50,
                "required_metrics": [
                    "core_functionality",
                    "performance",
                    "stability"
                ]
            },
            "limited": {
                "min_duration_days": 30,
                "max_duration_days": 60,
                "min_users": 100,
                "max_users": 500,
                "required_metrics": [
                    "core_functionality",
                    "performance",
                    "stability",
                    "user_feedback",
                    "error_rate"
                ]
            },
            "open": {
                "min_duration_days": 60,
                "max_duration_days": 120,
                "min_users": 1000,
                "max_users": None,  # No upper limit
                "required_metrics": [
                    "core_functionality",
                    "performance",
                    "stability",
                    "user_feedback",
                    "error_rate",
                    "scalability",
                    "security"
                ]
            }
        }
        
        # Load stakeholders
        self.stakeholders = self._load_stakeholders()
        
    def _create_directories(self) -> None:
        """Create required directories"""
        directories = [
            self.BETA_EVIDENCE_PATH,
            self.BETA_LOGS_PATH,
            self.BETA_FEEDBACK_PATH,
            self.BETA_DATA_PATH,
            self.BETA_MONITORING_PATH
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    def _load_stakeholders(self) -> Dict[str, StakeholderConfig]:
        """Load stakeholder configurations"""
        stakeholders = {}
        
        # Example stakeholder configurations
        stakeholders["beta_manager@example.com"] = StakeholderConfig(
            email="beta_manager@example.com",
            roles=[StakeholderRole.BETA_MANAGER],
            notification_channels=["email", "slack"],
            notification_levels=[NotificationLevel.CRITICAL, NotificationLevel.HIGH],
            phases_of_interest=None  # Interested in all phases
        )
        stakeholders["tech_lead@example.com"] = StakeholderConfig(
            email="tech_lead@example.com",
            roles=[StakeholderRole.TECHNICAL_LEAD],
            notification_channels=["email", "slack", "teams"],
            notification_levels=[NotificationLevel.CRITICAL, NotificationLevel.HIGH],
            phases_of_interest=["internal", "limited"]
        )
        
        return stakeholders

    def get_notification_config(self, notification_type: str) -> Optional[Dict[str, Any]]:
        """Get notification configuration for a specific type"""
        templates = {
            "phase_transition": """
Phase Transition Alert:
- From: {from_phase}
- To: {to_phase}
- Status: {status}
- Timestamp: {timestamp}
""",
            "validation_failure": """
Validation Failure Alert:
- Phase: {phase_name}
- Component: {component}
- Error: {error}
- Details: {details}
- Timestamp: {timestamp}
""",
            "evidence_submitted": """
Evidence Submission Alert:
- Phase: {phase_name}
- Type: {evidence_type}
- Status: {status}
- Submitted By: {submitted_by}
- Timestamp: {timestamp}

Details:
{evidence_details}
""",
            "phase_completion": """
Phase Completion Alert:
- Phase: {phase_name}
- Status: Completed
- Duration: {duration}
- Timestamp: {timestamp}

Summary:
{summary}
""",
            "critical_path_completion": """
Beta Testing Critical Path Completed!
- Total Duration: {duration}
- Completion Time: {timestamp}

Phase Summary:
{phase_summary}

Overall Status:
{status_summary}
"""
        }
        
        if notification_type not in templates:
            return None
            
        return {
            "template": templates[notification_type],
            "level": "high" if notification_type in ["validation_failure", "critical_path_completion"] else "medium"
        }
        
    def get_stakeholders_for_notification(
        self,
        notification_type: str,
        phase_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get stakeholders that should receive a specific notification"""
        notification_config = self.get_notification_config(notification_type)
        if not notification_config:
            return []
            
        level = notification_config["level"]
        stakeholders = []
        
        for stakeholder in self.stakeholders.values():
            # Check if stakeholder should receive this notification level
            if level not in stakeholder.notification_levels:
                continue
                
            # Check if stakeholder is interested in this phase
            if phase_name and phase_name not in stakeholder.phases_of_interest:
                continue
                
            # Check role-based rules
            if notification_type == "validation_failure" and StakeholderRole.TECHNICAL_LEAD not in stakeholder.roles:
                continue
                
            if notification_type == "critical_path_completion":
                if not any(role in stakeholder.roles for role in [StakeholderRole.BETA_MANAGER, StakeholderRole.PRODUCT_OWNER]):
                    continue
                    
            stakeholders.append({
                "email": stakeholder.email,
                "roles": stakeholder.roles,
                "notification_channels": stakeholder.notification_channels,
                "notification_levels": stakeholder.notification_levels,
                "phases_of_interest": stakeholder.phases_of_interest
            })
            
        return stakeholders

    def add_stakeholder(self, email: str, roles: List[StakeholderRole], 
                       notification_channels: List[str], 
                       notification_levels: List[NotificationLevel],
                       phases_of_interest: Optional[List[str]] = None) -> None:
        """Add a new stakeholder configuration"""
        self.stakeholders[email] = StakeholderConfig(
            email=email,
            roles=roles,
            notification_channels=notification_channels,
            notification_levels=notification_levels,
            phases_of_interest=phases_of_interest
        )

    def remove_stakeholder(self, email: str) -> None:
        """Remove a stakeholder configuration"""
        if email in self.stakeholders:
            del self.stakeholders[email]

    def update_stakeholder(self, email: str, **updates) -> None:
        """Update a stakeholder's configuration"""
        if email in self.stakeholders:
            stakeholder = self.stakeholders[email]
            for key, value in updates.items():
                if hasattr(stakeholder, key):
                    setattr(stakeholder, key, value)

    def get_phase_config(self, phase: str) -> Dict:
        """Get configuration for a specific phase"""
        if phase not in self.PHASE_REQUIREMENTS:
            raise ValueError(f"Invalid phase: {phase}")
        return self.PHASE_REQUIREMENTS[phase]
