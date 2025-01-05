"""Alert management system for the medication tracking application."""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pytz
from .monitoring import MetricsCollector, HIPAACompliantLogger
from ..services.notification_service import NotificationService
from .alert_rules import AlertRuleSet

logger = HIPAACompliantLogger()

class AlertManager:
    """Manage and process system alerts."""
    
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service
        self.rule_set = AlertRuleSet()
        self.alert_history: Dict[str, List[Dict]] = {}
        self.metrics = MetricsCollector()

    def check_alerts(self, category: str, metrics: Dict[str, float]) -> List[Dict]:
        """Check metrics against alert rules for a category."""
        alerts = []
        rules = self.rule_set.get_rules(category)
        current_time = datetime.now(pytz.UTC)

        for rule in rules:
            metric_value = metrics.get(rule.name, 0)
            if rule.should_trigger(metric_value, current_time):
                alert = {
                    "severity": rule.severity,
                    "type": rule.name,
                    "category": rule.category,
                    "message": rule.description,
                    "timestamp": current_time,
                    "value": metric_value,
                    "threshold": rule.threshold
                }
                alerts.append(alert)
                rule.mark_triggered(current_time)
                self._record_alert(alert)

        return alerts

    def _record_alert(self, alert: Dict) -> None:
        """Record alert in history and metrics."""
        alert_type = alert["type"]
        if alert_type not in self.alert_history:
            self.alert_history[alert_type] = []
        
        self.alert_history[alert_type].append(alert)
        self.metrics.track_alert(
            alert_type=alert_type,
            severity=alert["severity"],
            category=alert["category"]
        )

    def process_alerts(self, alerts: List[Dict]) -> None:
        """Process and send alerts through appropriate channels."""
        for alert in alerts:
            # Log alert
            logger.log(
                level="critical" if alert["severity"] == "critical" else "error",
                message=f"Alert triggered: {alert['message']}",
                extra={
                    "alert_type": alert["type"],
                    "severity": alert["severity"],
                    "category": alert["category"],
                    "value": alert["value"],
                    "threshold": alert["threshold"]
                }
            )

            # Get notification channels
            rules = self.rule_set.get_rules(alert["category"])
            rule = next((r for r in rules if r.name == alert["type"]), None)
            if not rule:
                continue

            # Send notifications
            for channel in rule.notification_channels:
                try:
                    self.notification_service.send_notification(
                        type="system_alert",
                        severity=alert["severity"],
                        message=alert["message"],
                        metadata={
                            "alert_type": alert["type"],
                            "category": alert["category"],
                            "value": alert["value"],
                            "threshold": alert["threshold"],
                            "channel": channel
                        },
                        channel=channel
                    )
                except Exception as e:
                    logger.log(
                        level="error",
                        message=f"Failed to send alert notification: {str(e)}",
                        extra={
                            "alert_type": alert["type"],
                            "channel": channel
                        }
                    )
                    self.metrics.track_error(
                        operation="send_alert_notification",
                        error_type=type(e).__name__,
                        extra_tags={
                            "alert_type": alert["type"],
                            "channel": channel
                        }
                    )

    def get_alert_history(
        self,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict]:
        """Get filtered alert history."""
        alerts = []
        for type_alerts in self.alert_history.values():
            for alert in type_alerts:
                if alert_type and alert["type"] != alert_type:
                    continue
                if severity and alert["severity"] != severity:
                    continue
                if category and alert["category"] != category:
                    continue
                if start_time and alert["timestamp"] < start_time:
                    continue
                if end_time and alert["timestamp"] > end_time:
                    continue
                alerts.append(alert)
        
        return sorted(alerts, key=lambda x: x["timestamp"], reverse=True)

    def clear_old_alerts(self, max_age: timedelta) -> None:
        """Clear alerts older than max_age."""
        cutoff_time = datetime.now(pytz.UTC) - max_age
        for alert_type in self.alert_history:
            self.alert_history[alert_type] = [
                alert for alert in self.alert_history[alert_type]
                if alert["timestamp"] > cutoff_time
            ]
