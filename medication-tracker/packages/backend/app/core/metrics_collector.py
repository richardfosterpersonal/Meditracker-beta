"""
Metrics Collector Module
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
from app.core.evidence_collector import EvidenceCollector

class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"

class MetricCategory(Enum):
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    VALIDATION = "validation"
    BUSINESS = "business"

class MetricsCollector:
    def __init__(
        self,
        evidence_collector: EvidenceCollector,
        metrics_dir: str = "/metrics"
    ):
        self.evidence_collector = evidence_collector
        self.metrics_dir = Path(metrics_dir)
        self.logger = logging.getLogger(__name__)
        
        # Ensure metrics directory exists
        self.metrics_dir.mkdir(parents=True, exist_ok=True)

        # Initialize metrics storage
        self.metrics: Dict[str, Dict[str, Any]] = {}
        
        # Load existing metrics
        self._load_metrics()

    async def collect_metric(
        self,
        metric_name: str,
        metric_type: MetricType,
        category: MetricCategory,
        value: float,
        labels: Dict[str, str],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Collect a metric with validation and evidence
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Validate metric data
        validation_result = await self._validate_metric(
            metric_name, metric_type, category, value, labels
        )
        if not validation_result.is_valid:
            return validation_result

        # Build metric data
        metric_data = {
            "name": metric_name,
            "type": metric_type.value,
            "category": category.value,
            "value": value,
            "labels": labels,
            "timestamp": timestamp
        }

        # Update metrics storage
        if metric_name not in self.metrics:
            self.metrics[metric_name] = {
                "type": metric_type.value,
                "category": category.value,
                "values": []
            }
        
        self.metrics[metric_name]["values"].append({
            "value": value,
            "labels": labels,
            "timestamp": timestamp
        })

        # Collect evidence
        evidence["metric"] = metric_data
        await self.evidence_collector.collect_evidence(
            evidence_type="metric",
            evidence_data=metric_data
        )

        # Save metrics to disk
        self._save_metrics()

        # Log metric collection
        self._log_metric(metric_data)

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            evidence=evidence
        )

    async def get_metric(
        self,
        metric_name: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        labels: Optional[Dict[str, str]] = None
    ) -> ValidationResult:
        """
        Retrieve metric values with optional filters
        """
        timestamp = datetime.utcnow().isoformat()

        if metric_name not in self.metrics:
            return ValidationResult(
                is_valid=False,
                error=f"Metric {metric_name} not found",
                timestamp=timestamp
            )

        values = self.metrics[metric_name]["values"]
        filtered_values = []

        for value in values:
            # Apply time filters
            if start_time and value["timestamp"] < start_time:
                continue
            if end_time and value["timestamp"] > end_time:
                continue
            
            # Apply label filters
            if labels:
                match = True
                for key, val in labels.items():
                    if key not in value["labels"] or value["labels"][key] != val:
                        match = False
                        break
                if not match:
                    continue
            
            filtered_values.append(value)

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            data={
                "name": metric_name,
                "type": self.metrics[metric_name]["type"],
                "category": self.metrics[metric_name]["category"],
                "values": filtered_values
            }
        )

    async def get_metrics_summary(
        self,
        category: Optional[MetricCategory] = None
    ) -> ValidationResult:
        """
        Get summary of all metrics, optionally filtered by category
        """
        timestamp = datetime.utcnow().isoformat()
        summary = {}

        for metric_name, metric_data in self.metrics.items():
            if category and metric_data["category"] != category.value:
                continue

            values = metric_data["values"]
            if not values:
                continue

            latest_value = values[-1]["value"]
            all_values = [v["value"] for v in values]

            summary[metric_name] = {
                "type": metric_data["type"],
                "category": metric_data["category"],
                "latest_value": latest_value,
                "min_value": min(all_values),
                "max_value": max(all_values),
                "avg_value": sum(all_values) / len(all_values)
            }

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp,
            data=summary
        )

    async def _validate_metric(
        self,
        metric_name: str,
        metric_type: MetricType,
        category: MetricCategory,
        value: float,
        labels: Dict[str, str]
    ) -> ValidationResult:
        """
        Validate metric data against requirements
        """
        timestamp = datetime.utcnow().isoformat()

        if not metric_name:
            return ValidationResult(
                is_valid=False,
                error="Metric name is required",
                timestamp=timestamp
            )

        if not isinstance(value, (int, float)):
            return ValidationResult(
                is_valid=False,
                error="Metric value must be numeric",
                timestamp=timestamp
            )

        if not isinstance(labels, dict):
            return ValidationResult(
                is_valid=False,
                error="Labels must be a dictionary",
                timestamp=timestamp
            )

        return ValidationResult(
            is_valid=True,
            timestamp=timestamp
        )

    def _load_metrics(self) -> None:
        """
        Load metrics from disk
        """
        try:
            metrics_file = self.metrics_dir / "metrics.json"
            if metrics_file.exists():
                with open(metrics_file, "r") as f:
                    self.metrics = json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load metrics: {str(e)}")
            self.metrics = {}

    def _save_metrics(self) -> None:
        """
        Save metrics to disk
        """
        try:
            metrics_file = self.metrics_dir / "metrics.json"
            with open(metrics_file, "w") as f:
                json.dump(self.metrics, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save metrics: {str(e)}")

    def _log_metric(self, metric_data: Dict[str, Any]) -> None:
        """
        Log metric collection
        """
        self.logger.info(json.dumps({
            "event": "metric_collected",
            "metric": metric_data
        }))
