"""
Monitoring Alerts Module
Maintains critical path alignment and validation chain
Last Updated: 2025-01-02T10:59:41+01:00
"""
from datetime import datetime
from enum import Enum
from pathlib import Path
import logging
import json
from typing import Dict, Any, Optional, List

from .metrics import MetricsCollector
from .evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel,
    Evidence
)
from .validation_utils import ValidationUtils, PreValidationType, ValidationError
from .validation_hooks import ValidationHooks, ValidationStage, ValidationHookPriority, ValidationHook
from .validation_types import ValidationResult, ValidationStatus, ValidationLevel

class AlertSeverity(str, Enum):
    """Alert severity levels aligned with critical path"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AlertCategory(str, Enum):
    """Alert categories aligned with critical path"""
    MEDICATION_SAFETY = "medication_safety"  # Critical path: Medication safety
    DATA_SECURITY = "data_security"         # Critical path: HIPAA compliance
    PERFORMANCE = "performance"             # Critical path: Core infrastructure
    COMPLIANCE = "compliance"               # Critical path: Regulatory
    SYSTEM = "system"                       # Critical path: Infrastructure
    BUSINESS = "business"                   # Critical path: User experience

class AlertStatus(str, Enum):
    """Alert statuses with validation tracking"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SILENCED = "silenced"

class MonitoringAlerts:
    """
    Monitoring Alerts System
    Integrated with evidence collection and validation hooks
    """
    
    def __init__(
        self,
        metrics_collector: MetricsCollector,
        evidence_collector: EvidenceCollector,
        alerts_dir: str = "/alerts"
    ):
        self.metrics_collector = metrics_collector
        self.evidence_collector = evidence_collector
        self.validation_utils = ValidationUtils(evidence_collector)
        self.alerts_dir = Path(alerts_dir)
        self.hooks = ValidationHooks.get_instance()
        self.logger = logging.getLogger(__name__)
        
        # Pre-validate required components
        self._pre_validate_components()
        
        # Ensure alerts directory exists
        self.alerts_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize alerts storage
        self.alerts: Dict[str, Dict[str, Any]] = {}
        
        # Register validation hooks
        self._register_validation_hooks()
        
        # Load existing alerts
        self._load_alerts()

    def _register_validation_hooks(self):
        """Register validation hooks for monitoring alerts"""
        # Alert system validation
        self.hooks.register_hook(ValidationHook(
            "alert_system",
            ValidationStage.PRE_VALIDATION,
            ValidationHookPriority.CRITICAL,
            self._validate_alert_system
        ))
        
        # Alert metrics validation
        self.hooks.register_hook(ValidationHook(
            "alert_metrics",
            ValidationStage.VALIDATION,
            ValidationHookPriority.HIGH,
            self._validate_alert_metrics
        ))
        
        # Alert evidence validation
        self.hooks.register_hook(ValidationHook(
            "alert_evidence",
            ValidationStage.POST_VALIDATION,
            ValidationHookPriority.HIGH,
            self._validate_alert_evidence
        ))
        
    async def _validate_alert_system(self) -> ValidationResult:
        """Validate alert system components"""
        try:
            # Validate directory structure
            await self.validation_utils.validate_file_existence(
                [str(self.alerts_dir)],
                base_path=None
            )

            # Validate critical path requirements
            await self.validation_utils.validate_critical_path(
                "monitoring_alerts",
                [
                    "alert_creation",
                    "status_updates",
                    "metric_monitoring",
                    "evidence_collection"
                ]
            )

            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Alert system components validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Alert system validation error: {str(e)}"
            )
            
    async def _validate_alert_metrics(self) -> ValidationResult:
        """Validate alert metrics collection"""
        try:
            metrics = await self.metrics_collector.get_metrics(
                category="alert_metrics"
            )
            if not metrics["valid"]:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Alert metrics validation failed",
                    details=metrics
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Alert metrics validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Alert metrics validation error: {str(e)}"
            )
            
    async def _validate_alert_evidence(self) -> ValidationResult:
        """Validate alert evidence collection"""
        try:
            evidence = await self.evidence_collector.get_evidence(
                category=EvidenceCategory.ALERT_EVIDENCE
            )
            if not evidence["valid"]:
                return ValidationResult(
                    valid=False,
                    level=ValidationLevel.ERROR,
                    status=ValidationStatus.FAILED,
                    message="Alert evidence validation failed",
                    details=evidence
                )
                
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Alert evidence validated successfully"
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Alert evidence validation error: {str(e)}"
            )
            
    async def validate_alerts(self) -> ValidationResult:
        """Validate complete alert system"""
        try:
            # Run all validation hooks
            for stage in [
                ValidationStage.PRE_VALIDATION,
                ValidationStage.VALIDATION,
                ValidationStage.POST_VALIDATION
            ]:
                stage_result = await self.hooks.validate_stage(stage)
                if not stage_result["valid"]:
                    return ValidationResult(
                        valid=False,
                        level=ValidationLevel.ERROR,
                        status=ValidationStatus.FAILED,
                        message=f"Stage {stage.value} validation failed",
                        details=stage_result
                    )
                    
            return ValidationResult(
                valid=True,
                level=ValidationLevel.INFO,
                status=ValidationStatus.PASSED,
                message="Alert system validation successful",
                details={"stages": self.hooks.get_validation_state()}
            )
            
        except Exception as e:
            self.logger.error(f"Alert validation failed: {str(e)}")
            return ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                status=ValidationStatus.FAILED,
                message=f"Alert validation failed: {str(e)}"
            )
            
    def _pre_validate_components(self) -> None:
        """Pre-validate required components"""
        try:
            # Validate metrics collector
            if not isinstance(self.metrics_collector, MetricsCollector):
                raise ValueError("Invalid metrics collector")
                
            # Validate evidence collector
            if not isinstance(self.evidence_collector, EvidenceCollector):
                raise ValueError("Invalid evidence collector")
                
            # Validate alerts directory
            alerts_dir = Path(self.alerts_dir)
            if not alerts_dir.parent.exists():
                raise ValueError(f"Parent directory does not exist: {alerts_dir.parent}")
                
        except Exception as e:
            self.logger.error(f"Component pre-validation failed: {str(e)}")
            raise

    async def create_alert(
        self,
        alert_name: str,
        severity: AlertSeverity,
        category: AlertCategory,
        message: str,
        metric_threshold: Optional[Dict[str, float]] = None,
        evidence: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a new alert with validation and evidence
        Critical Path: Alert creation and validation
        """
        # Convert alert category to evidence category
        evidence_category = EvidenceCategory[category.upper()]
        
        # Create evidence for alert creation
        alert_evidence = await self.evidence_collector.collect_evidence(
            category=evidence_category,
            validation_level=ValidationLevel[severity.upper()],
            data={
                "alert_name": alert_name,
                "message": message,
                "metric_threshold": metric_threshold,
                "custom_evidence": evidence
            },
            source="monitoring_alerts"
        )
        
        # Create alert with evidence
        alert_data = {
            "name": alert_name,
            "severity": severity,
            "category": category,
            "message": message,
            "status": AlertStatus.ACTIVE,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "metric_threshold": metric_threshold,
            "evidence_id": alert_evidence.id,
            "validation_chain": [alert_evidence.id]
        }
        
        # Store alert
        self.alerts[alert_name] = alert_data
        await self._save_alerts()
        
        # Track metric
        self.metrics_collector.track_alert(
            alert_type=alert_name,
            severity=severity,
            category=category
        )
        
        return alert_data

    async def update_alert_status(
        self,
        alert_name: str,
        status: AlertStatus,
        comment: Optional[str] = None,
        evidence: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Update alert status with validation and evidence
        Critical Path: Alert status tracking
        """
        if alert_name not in self.alerts:
            raise ValueError(f"Alert {alert_name} not found")
            
        alert = self.alerts[alert_name]
        
        # Create evidence for status update
        status_evidence = await self.evidence_collector.collect_evidence(
            category=EvidenceCategory[alert["category"].upper()],
            validation_level=ValidationLevel[alert["severity"].upper()],
            data={
                "alert_name": alert_name,
                "old_status": alert["status"],
                "new_status": status,
                "comment": comment,
                "custom_evidence": evidence
            },
            source="monitoring_alerts"
        )
        
        # Update alert
        alert["status"] = status
        alert["updated_at"] = datetime.utcnow().isoformat()
        alert["validation_chain"].append(status_evidence.id)
        
        if comment:
            alert["last_comment"] = comment
            
        await self._save_alerts()
        return alert

    async def check_metric_alerts(self) -> List[Dict[str, Any]]:
        """
        Check all metric-based alerts against current metrics
        Critical Path: Metric validation
        """
        triggered_alerts = []
        
        for alert_name, alert in self.alerts.items():
            if alert["status"] != AlertStatus.ACTIVE:
                continue
                
            if not alert.get("metric_threshold"):
                continue
                
            # Get current metrics
            current_metrics = await self.metrics_collector.get_metrics(
                category=alert["category"]
            )
            
            # Check thresholds
            for metric_name, threshold in alert["metric_threshold"].items():
                if metric_name not in current_metrics:
                    continue
                    
                current_value = current_metrics[metric_name]
                
                if current_value > threshold:
                    # Create evidence for threshold breach
                    breach_evidence = await self.evidence_collector.collect_evidence(
                        category=EvidenceCategory[alert["category"].upper()],
                        validation_level=ValidationLevel[alert["severity"].upper()],
                        data={
                            "alert_name": alert_name,
                            "metric_name": metric_name,
                            "threshold": threshold,
                            "current_value": current_value
                        },
                        source="monitoring_alerts"
                    )
                    
                    alert["validation_chain"].append(breach_evidence.id)
                    triggered_alerts.append(alert)
                    
        await self._save_alerts()
        return triggered_alerts

    async def get_alert_history(
        self,
        alert_name: Optional[str] = None,
        category: Optional[AlertCategory] = None,
        severity: Optional[AlertSeverity] = None,
        status: Optional[AlertStatus] = None,
        with_evidence: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get alert history with optional filters
        Critical Path: Alert history tracking
        """
        alerts = list(self.alerts.values())
        
        # Apply filters
        if alert_name:
            alerts = [a for a in alerts if a["name"] == alert_name]
        if category:
            alerts = [a for a in alerts if a["category"] == category]
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
        if status:
            alerts = [a for a in alerts if a["status"] == status]
            
        if with_evidence:
            # Fetch evidence for each alert
            for alert in alerts:
                evidence_chain = []
                for evidence_id in alert["validation_chain"]:
                    evidence = await self.evidence_collector.get_evidence(evidence_id)
                    if evidence:
                        evidence_chain.append(evidence.dict())
                alert["evidence_chain"] = evidence_chain
                
        return alerts

    async def get_validation_summary(self) -> Dict[str, Any]:
        """
        Get validation summary for all alerts
        Critical Path: Validation reporting
        """
        total_alerts = len(self.alerts)
        active_alerts = len([a for a in self.alerts.values() if a["status"] == AlertStatus.ACTIVE])
        
        # Get evidence summary
        evidence_summary = {}
        for alert in self.alerts.values():
            category = alert["category"]
            if category not in evidence_summary:
                evidence_summary[category] = {
                    "total_evidence": 0,
                    "validation_chain_length": 0
                }
            
            evidence_summary[category]["total_evidence"] += len(alert["validation_chain"])
            evidence_summary[category]["validation_chain_length"] += 1
            
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "evidence_summary": evidence_summary,
            "last_validated": datetime.utcnow().isoformat()
        }

    def _load_alerts(self) -> None:
        """Load alerts from storage"""
        alerts_file = self.alerts_dir / "alerts.json"
        if alerts_file.exists():
            with open(alerts_file, "r") as f:
                self.alerts = json.load(f)

    async def _save_alerts(self) -> None:
        """Save alerts to storage"""
        alerts_file = self.alerts_dir / "alerts.json"
        with open(alerts_file, "w") as f:
            json.dump(self.alerts, f, indent=2)
