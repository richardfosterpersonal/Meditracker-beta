"""Alert rules configuration for the medication tracking system."""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pytz

class AlertRule:
    """Base class for alert rules."""
    def __init__(
        self,
        name: str,
        description: str,
        severity: str,
        category: str,
        threshold: float,
        window: timedelta,
        notification_channels: List[str],
        cooldown: timedelta
    ):
        self.name = name
        self.description = description
        self.severity = severity
        self.category = category
        self.threshold = threshold
        self.window = window
        self.notification_channels = notification_channels
        self.cooldown = cooldown
        self.last_triggered: Optional[datetime] = None

    def should_trigger(self, value: float, timestamp: datetime) -> bool:
        """Check if alert should trigger based on value and cooldown."""
        if self.last_triggered and timestamp - self.last_triggered < self.cooldown:
            return False
        return value >= self.threshold

    def mark_triggered(self, timestamp: datetime) -> None:
        """Mark alert as triggered at timestamp."""
        self.last_triggered = timestamp

class AlertRuleSet:
    """Collection of alert rules by category."""
    
    def __init__(self):
        self.rules: Dict[str, List[AlertRule]] = self._initialize_rules()

    def _initialize_rules(self) -> Dict[str, List[AlertRule]]:
        """Initialize default alert rules."""
        return {
            "hipaa": [
                AlertRule(
                    name="unauthorized_phi_access",
                    description="Unauthorized PHI access detected",
                    severity="critical",
                    category="hipaa",
                    threshold=1,
                    window=timedelta(minutes=5),
                    notification_channels=["email", "sms", "push"],
                    cooldown=timedelta(minutes=15)
                ),
                AlertRule(
                    name="bulk_phi_access",
                    description="Bulk PHI access detected",
                    severity="critical",
                    category="hipaa",
                    threshold=10,
                    window=timedelta(minutes=5),
                    notification_channels=["email", "sms", "push"],
                    cooldown=timedelta(minutes=15)
                )
            ],
            "emergency": [
                AlertRule(
                    name="emergency_response_delay",
                    description="Emergency response delay detected",
                    severity="critical",
                    category="emergency",
                    threshold=5,  # minutes
                    window=timedelta(minutes=10),
                    notification_channels=["email", "sms", "push"],
                    cooldown=timedelta(minutes=5)
                ),
                AlertRule(
                    name="failed_emergency_notification",
                    description="Failed to deliver emergency notification",
                    severity="critical",
                    category="emergency",
                    threshold=1,
                    window=timedelta(minutes=5),
                    notification_channels=["email", "sms", "push"],
                    cooldown=timedelta(minutes=5)
                )
            ],
            "security": [
                AlertRule(
                    name="multiple_auth_failures",
                    description="Multiple authentication failures detected",
                    severity="high",
                    category="security",
                    threshold=5,
                    window=timedelta(minutes=15),
                    notification_channels=["email", "push"],
                    cooldown=timedelta(minutes=30)
                ),
                AlertRule(
                    name="suspicious_activity",
                    description="Suspicious activity pattern detected",
                    severity="high",
                    category="security",
                    threshold=3,
                    window=timedelta(minutes=15),
                    notification_channels=["email", "push"],
                    cooldown=timedelta(minutes=30)
                )
            ],
            "medication": [
                AlertRule(
                    name="missed_critical_medication",
                    description="Critical medication dose missed",
                    severity="high",
                    category="medication",
                    threshold=1,
                    window=timedelta(hours=1),
                    notification_channels=["email", "sms", "push"],
                    cooldown=timedelta(minutes=30)
                ),
                AlertRule(
                    name="low_medication_supply",
                    description="Low medication supply detected",
                    severity="medium",
                    category="medication",
                    threshold=7,  # days
                    window=timedelta(days=1),
                    notification_channels=["email", "push"],
                    cooldown=timedelta(days=1)
                )
            ]
        }

    def get_rules(self, category: str) -> List[AlertRule]:
        """Get all rules for a category."""
        return self.rules.get(category, [])
