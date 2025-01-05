"""
Dashboard Configuration
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:45:10+01:00
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum

class DashboardType(str, Enum):
    """Dashboard types aligned with critical path"""
    MEDICATION_SAFETY = "medication_safety"
    DATA_SECURITY = "data_security"
    PERFORMANCE = "performance"
    COMPLIANCE = "compliance"
    BUSINESS = "business"

class MetricDisplay(str, Enum):
    """Metric display types"""
    LINE = "line"
    BAR = "bar"
    GAUGE = "gauge"
    TABLE = "table"
    ALERT = "alert"

class ValidationLevel(str, Enum):
    """Validation levels for dashboard components"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class DashboardMetric(BaseModel):
    """Individual metric configuration with validation"""
    name: str = Field(..., description="Metric name")
    display_type: MetricDisplay = Field(..., description="How to display the metric")
    refresh_interval: int = Field(
        default=60,
        ge=30,
        le=3600,
        description="Refresh interval in seconds"
    )
    validation_level: ValidationLevel = Field(
        ...,
        description="Validation importance level"
    )
    alert_threshold: Optional[float] = Field(
        None,
        description="Optional alert threshold"
    )
    labels: Dict[str, str] = Field(
        default_factory=dict,
        description="Metric labels"
    )

    @validator("name")
    def validate_metric_name(cls, v: str) -> str:
        """Validate metric name format"""
        if not v or not v.strip():
            raise ValueError("Metric name cannot be empty")
        if len(v) > 100:
            raise ValueError("Metric name too long")
        return v.strip()

class DashboardPanel(BaseModel):
    """Dashboard panel configuration with validation"""
    title: str = Field(..., description="Panel title")
    description: str = Field(..., description="Panel description")
    metrics: List[DashboardMetric] = Field(
        ...,
        description="List of metrics to display"
    )
    validation_level: ValidationLevel = Field(
        ...,
        description="Validation importance level"
    )
    layout: Dict[str, int] = Field(
        ...,
        description="Panel layout configuration"
    )

    @validator("metrics")
    def validate_metrics(cls, v: List[DashboardMetric]) -> List[DashboardMetric]:
        """Validate metrics configuration"""
        if not v:
            raise ValueError("Panel must have at least one metric")
        if len(v) > 10:
            raise ValueError("Too many metrics in one panel")
        return v

class DashboardConfig(BaseModel):
    """Complete dashboard configuration with validation chain"""
    id: str = Field(..., description="Dashboard ID")
    name: str = Field(..., description="Dashboard name")
    type: DashboardType = Field(..., description="Dashboard type")
    description: str = Field(..., description="Dashboard description")
    panels: List[DashboardPanel] = Field(
        ...,
        description="Dashboard panels"
    )
    refresh_interval: int = Field(
        default=300,
        ge=60,
        le=3600,
        description="Global refresh interval in seconds"
    )
    validation_level: ValidationLevel = Field(
        ...,
        description="Dashboard validation level"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp"
    )

    @validator("panels")
    def validate_panels(cls, v: List[DashboardPanel]) -> List[DashboardPanel]:
        """Validate panels configuration"""
        if not v:
            raise ValueError("Dashboard must have at least one panel")
        if len(v) > 20:
            raise ValueError("Too many panels in dashboard")
        return v

    def validate_critical_path(self) -> bool:
        """Validate dashboard against critical path requirements"""
        if self.type == DashboardType.MEDICATION_SAFETY:
            return self._validate_medication_safety()
        elif self.type == DashboardType.DATA_SECURITY:
            return self._validate_data_security()
        elif self.type == DashboardType.PERFORMANCE:
            return self._validate_performance()
        return True

    def _validate_medication_safety(self) -> bool:
        """Validate medication safety dashboard requirements"""
        required_metrics = {
            "medication_errors",
            "prescription_validation_rate",
            "alert_response_time"
        }
        dashboard_metrics = {
            metric.name
            for panel in self.panels
            for metric in panel.metrics
        }
        return required_metrics.issubset(dashboard_metrics)

    def _validate_data_security(self) -> bool:
        """Validate data security dashboard requirements"""
        required_metrics = {
            "failed_login_attempts",
            "data_encryption_status",
            "hipaa_compliance_score"
        }
        dashboard_metrics = {
            metric.name
            for panel in self.panels
            for metric in panel.metrics
        }
        return required_metrics.issubset(dashboard_metrics)

    def _validate_performance(self) -> bool:
        """Validate performance dashboard requirements"""
        required_metrics = {
            "api_latency",
            "error_rate",
            "resource_utilization"
        }
        dashboard_metrics = {
            metric.name
            for panel in self.panels
            for metric in panel.metrics
        }
        return required_metrics.issubset(dashboard_metrics)

class DashboardService:
    """Service for managing dashboard configurations"""

    def __init__(self):
        self.configs: Dict[str, DashboardConfig] = {}

    async def create_dashboard(
        self,
        config: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> DashboardConfig:
        """
        Create new dashboard with validation
        Critical Path: Configuration validation
        """
        dashboard = DashboardConfig(**config)
        
        # Validate critical path requirements
        if not dashboard.validate_critical_path():
            raise ValueError(
                "Dashboard does not meet critical path requirements"
            )

        self.configs[dashboard.id] = dashboard
        return dashboard

    async def update_dashboard(
        self,
        dashboard_id: str,
        config: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> DashboardConfig:
        """
        Update dashboard with validation
        Critical Path: Configuration validation
        """
        if dashboard_id not in self.configs:
            raise ValueError("Dashboard not found")

        dashboard = DashboardConfig(**config)
        
        # Validate critical path requirements
        if not dashboard.validate_critical_path():
            raise ValueError(
                "Dashboard does not meet critical path requirements"
            )

        self.configs[dashboard_id] = dashboard
        return dashboard

    async def get_dashboard(
        self,
        dashboard_id: str
    ) -> Optional[DashboardConfig]:
        """
        Get dashboard configuration
        Critical Path: Data access
        """
        return self.configs.get(dashboard_id)

    async def list_dashboards(
        self,
        dashboard_type: Optional[DashboardType] = None
    ) -> List[DashboardConfig]:
        """
        List dashboard configurations
        Critical Path: Data access
        """
        if dashboard_type:
            return [
                config for config in self.configs.values()
                if config.type == dashboard_type
            ]
        return list(self.configs.values())

    async def delete_dashboard(
        self,
        dashboard_id: str,
        evidence: Dict[str, Any]
    ) -> bool:
        """
        Delete dashboard configuration
        Critical Path: Data mutation
        """
        if dashboard_id not in self.configs:
            return False
        del self.configs[dashboard_id]
        return True
