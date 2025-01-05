"""
Metrics Model
Defines metric types and validation rules
Last Updated: 2024-12-30T23:08:51+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

class MetricType(Enum):
    """Types of metrics that can be collected"""
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    USABILITY = "usability"
    SECURITY = "security"
    COMPLIANCE = "compliance"

class MetricPriority(Enum):
    """Priority levels for metrics"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Metrics:
    """
    Metrics model for tracking and validating beta metrics
    """
    
    def __init__(self):
        self.current_time = datetime.utcnow().isoformat()
        
    def create_metric(
        self,
        name: str,
        type: MetricType,
        value: float,
        priority: MetricPriority,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a new metric"""
        return {
            "name": name,
            "type": type.value,
            "value": value,
            "priority": priority.value,
            "metadata": metadata or {},
            "timestamp": self.current_time
        }
        
    def validate_metric(
        self,
        metric: Dict,
        threshold: float,
        comparison: str = "greater_than"
    ) -> Dict:
        """Validate a metric against a threshold"""
        try:
            value = metric["value"]
            
            if comparison == "greater_than":
                valid = value > threshold
            elif comparison == "less_than":
                valid = value < threshold
            elif comparison == "equal":
                valid = abs(value - threshold) < 1e-6
            else:
                raise ValueError(f"Invalid comparison: {comparison}")
                
            return {
                "success": True,
                "valid": valid,
                "metric": metric["name"],
                "value": value,
                "threshold": threshold,
                "comparison": comparison
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    def aggregate_metrics(
        self,
        metrics: List[Dict],
        aggregation: str = "average"
    ) -> Dict:
        """Aggregate multiple metrics"""
        try:
            if not metrics:
                return {
                    "success": False,
                    "error": "No metrics provided"
                }
                
            values = [m["value"] for m in metrics]
            
            if aggregation == "average":
                result = sum(values) / len(values)
            elif aggregation == "sum":
                result = sum(values)
            elif aggregation == "min":
                result = min(values)
            elif aggregation == "max":
                result = max(values)
            else:
                raise ValueError(f"Invalid aggregation: {aggregation}")
                
            return {
                "success": True,
                "value": result,
                "aggregation": aggregation,
                "count": len(metrics)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    def format_metric(
        self,
        metric: Dict,
        format: str = "standard"
    ) -> Dict:
        """Format a metric for display"""
        try:
            if format == "standard":
                return {
                    "success": True,
                    "formatted": {
                        "name": metric["name"],
                        "value": f"{metric['value']:.2f}",
                        "type": metric["type"],
                        "priority": metric["priority"],
                        "timestamp": metric["timestamp"]
                    }
                }
            elif format == "minimal":
                return {
                    "success": True,
                    "formatted": {
                        "name": metric["name"],
                        "value": f"{metric['value']:.2f}"
                    }
                }
            elif format == "detailed":
                return {
                    "success": True,
                    "formatted": {
                        **metric,
                        "value": f"{metric['value']:.2f}"
                    }
                }
            else:
                raise ValueError(f"Invalid format: {format}")
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    def get_metric_summary(
        self,
        metrics: List[Dict],
        include_metadata: bool = False
    ) -> Dict:
        """Get a summary of multiple metrics"""
        try:
            if not metrics:
                return {
                    "success": False,
                    "error": "No metrics provided"
                }
                
            # Group metrics by type
            by_type = {}
            for metric in metrics:
                metric_type = metric["type"]
                if metric_type not in by_type:
                    by_type[metric_type] = []
                by_type[metric_type].append(metric)
                
            # Calculate summaries
            summaries = {}
            for metric_type, type_metrics in by_type.items():
                summary = {
                    "count": len(type_metrics),
                    "average": sum(m["value"] for m in type_metrics) / len(type_metrics),
                    "min": min(m["value"] for m in type_metrics),
                    "max": max(m["value"] for m in type_metrics)
                }
                
                if include_metadata:
                    summary["metrics"] = type_metrics
                    
                summaries[metric_type] = summary
                
            return {
                "success": True,
                "summaries": summaries,
                "total_count": len(metrics)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
