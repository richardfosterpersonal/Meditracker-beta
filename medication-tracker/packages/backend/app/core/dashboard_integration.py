"""
Dashboard Integration Module
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:35:48+01:00
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional
import json
import logging
from pathlib import Path

from app.core.validation_types import ValidationResult
from app.core.metrics_collector import MetricsCollector
from app.core.evidence_collector import EvidenceCollector

class DashboardType(Enum):
    METRICS = "metrics"
    ALERTS = "alerts"
    AUDIT = "audit"
    VALIDATION = "validation"
    COMPLIANCE = "compliance"

class DashboardIntegration:
    def __init__(
        self,
        metrics_collector: MetricsCollector,
        evidence_collector: EvidenceCollector,
        dashboard_config_dir: str = "/config/dashboards"
    ):
        self.metrics_collector = metrics_collector
        self.evidence_collector = evidence_collector
        self.dashboard_config_dir = Path(dashboard_config_dir)
        self.logger = logging.getLogger(__name__)
        
        # Ensure dashboard config directory exists
        self.dashboard_config_dir.mkdir(parents=True, exist_ok=True)

    async def create_dashboard(
        self,
        dashboard_name: str,
        dashboard_type: DashboardType,
        config: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Create a new dashboard with validation and evidence
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Validate dashboard config
        validation_result = await self._validate_dashboard_config(
            dashboard_name, dashboard_type, config
        )
        if not validation_result.is_valid:
            return validation_result

        # Build dashboard data
        dashboard_data = {
            "name": dashboard_name,
            "type": dashboard_type.value,
            "config": config,
            "created_at": timestamp,
            "updated_at": timestamp
        }

        # Save dashboard config
        config_file = self.dashboard_config_dir / f"{dashboard_name}.json"
        try:
            with open(config_file, "w") as f:
                json.dump(dashboard_data, f, indent=2)
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                error=f"Failed to save dashboard config: {str(e)}",
                timestamp=timestamp
            )

        # Collect evidence
        evidence["dashboard"] = dashboard_data
        await self.evidence_collector.collect_evidence(
            evidence_type="dashboard_creation",
            evidence_data=dashboard_data
        )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )

    async def update_dashboard_data(
        self,
        dashboard_name: str,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Update dashboard data with validation and evidence
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Load dashboard config
        config_file = self.dashboard_config_dir / f"{dashboard_name}.json"
        if not config_file.exists():
            return ValidationResult(
                is_valid=False,
                error=f"Dashboard {dashboard_name} not found",
                timestamp=timestamp
            )

        try:
            with open(config_file, "r") as f:
                dashboard_data = json.load(f)
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                error=f"Failed to load dashboard config: {str(e)}",
                timestamp=timestamp
            )

        # Update data based on dashboard type
        update_result = await self._update_dashboard_type_data(
            dashboard_data["type"],
            data,
            evidence
        )
        if not update_result.is_valid:
            return update_result

        # Collect evidence
        evidence["dashboard_update"] = {
            "dashboard_name": dashboard_name,
            "update_type": dashboard_data["type"],
            "timestamp": timestamp,
            "data": data
        }
        await self.evidence_collector.collect_evidence(
            evidence_type="dashboard_update",
            evidence_data=evidence["dashboard_update"]
        )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )

    async def _validate_dashboard_config(
        self,
        dashboard_name: str,
        dashboard_type: DashboardType,
        config: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate dashboard configuration
        """
        timestamp = datetime.utcnow().isoformat()

        if not dashboard_name:
            return ValidationResult(
                is_valid=False,
                error="Dashboard name is required",
                timestamp=timestamp
            )

        if not isinstance(config, dict):
            return ValidationResult(
                is_valid=False,
                error="Config must be a dictionary",
                timestamp=timestamp
            )

        # Validate required config fields based on type
        if dashboard_type == DashboardType.METRICS:
            if "metrics" not in config:
                return ValidationResult(
                    is_valid=False,
                    error="Metrics dashboard requires 'metrics' configuration",
                    timestamp=timestamp
                )
        elif dashboard_type == DashboardType.ALERTS:
            if "alerts" not in config:
                return ValidationResult(
                    is_valid=False,
                    error="Alerts dashboard requires 'alerts' configuration",
                    timestamp=timestamp
                )
        elif dashboard_type == DashboardType.AUDIT:
            if "audit_types" not in config:
                return ValidationResult(
                    is_valid=False,
                    error="Audit dashboard requires 'audit_types' configuration",
                    timestamp=timestamp
                )
        elif dashboard_type == DashboardType.VALIDATION:
            if "validation_rules" not in config:
                return ValidationResult(
                    is_valid=False,
                    error="Validation dashboard requires 'validation_rules' configuration",
                    timestamp=timestamp
                )
        elif dashboard_type == DashboardType.COMPLIANCE:
            if "compliance_checks" not in config:
                return ValidationResult(
                    is_valid=False,
                    error="Compliance dashboard requires 'compliance_checks' configuration",
                    timestamp=timestamp
                )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp
        )

    async def _update_dashboard_type_data(
        self,
        dashboard_type: str,
        data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Update dashboard data based on type
        """
        timestamp = datetime.utcnow().isoformat()

        try:
            if dashboard_type == DashboardType.METRICS.value:
                # Update metrics data
                for metric_name, metric_data in data.items():
                    await self.metrics_collector.collect_metric(
                        metric_name=metric_name,
                        metric_type=metric_data["type"],
                        category=metric_data["category"],
                        value=metric_data["value"],
                        labels=metric_data.get("labels", {}),
                        evidence=evidence
                    )
            
            elif dashboard_type == DashboardType.ALERTS.value:
                # Update alerts data
                evidence["alerts_update"] = {
                    "alerts": data,
                    "timestamp": timestamp
                }
                await self.evidence_collector.collect_evidence(
                    evidence_type="alerts_update",
                    evidence_data=evidence["alerts_update"]
                )
            
            elif dashboard_type == DashboardType.AUDIT.value:
                # Update audit data
                evidence["audit_update"] = {
                    "audit_data": data,
                    "timestamp": timestamp
                }
                await self.evidence_collector.collect_evidence(
                    evidence_type="audit_update",
                    evidence_data=evidence["audit_update"]
                )
            
            elif dashboard_type == DashboardType.VALIDATION.value:
                # Update validation data
                evidence["validation_update"] = {
                    "validation_data": data,
                    "timestamp": timestamp
                }
                await self.evidence_collector.collect_evidence(
                    evidence_type="validation_update",
                    evidence_data=evidence["validation_update"]
                )
            
            elif dashboard_type == DashboardType.COMPLIANCE.value:
                # Update compliance data
                evidence["compliance_update"] = {
                    "compliance_data": data,
                    "timestamp": timestamp
                }
                await self.evidence_collector.collect_evidence(
                    evidence_type="compliance_update",
                    evidence_data=evidence["compliance_update"]
                )

        except Exception as e:
            return ValidationResult(
                is_valid=False,
                error=f"Failed to update dashboard data: {str(e)}",
                timestamp=timestamp
            )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )
