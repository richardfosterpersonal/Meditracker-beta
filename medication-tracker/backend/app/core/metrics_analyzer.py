"""
Metrics Analyzer
Analyzes and aggregates validation metrics
Last Updated: 2025-01-01T19:03:20+01:00
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import statistics
from collections import defaultdict

from .validation_metrics import ValidationMetrics, MetricType, ValidationLevel, ValidationStatus
from .beta_settings import BetaSettings

class MetricsAnalyzer:
    """Analyzes validation metrics and generates insights"""
    
    def __init__(self):
        self.settings = BetaSettings()
        self.metrics = ValidationMetrics()
    
    async def analyze_component_health(
        self,
        component: str,
        window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Analyze component health based on recent metrics
        
        Args:
            component: Component to analyze
            window_hours: Time window for analysis in hours
            
        Returns:
            Component health analysis
        """
        try:
            # Get recent metrics
            start_time = datetime.utcnow() - timedelta(hours=window_hours)
            metrics = await self.metrics.get_metrics(component)
            recent_metrics = [
                m for m in metrics
                if m.timestamp >= start_time
            ]
            
            if not recent_metrics:
                return {
                    "status": "unknown",
                    "confidence": 0.0,
                    "message": f"No metrics found in last {window_hours} hours"
                }
            
            # Calculate health indicators
            error_rate = self._calculate_error_rate(recent_metrics)
            success_rate = self._calculate_success_rate(recent_metrics)
            validation_times = self._extract_validation_times(recent_metrics)
            
            # Determine health status
            status = self._determine_health_status(
                error_rate=error_rate,
                success_rate=success_rate,
                validation_times=validation_times
            )
            
            return {
                "status": status["status"],
                "confidence": status["confidence"],
                "metrics": {
                    "error_rate": error_rate,
                    "success_rate": success_rate,
                    "avg_validation_time": statistics.mean(validation_times) if validation_times else 0,
                    "max_validation_time": max(validation_times) if validation_times else 0
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "confidence": 0.0,
                "message": f"Analysis failed: {str(e)}"
            }
    
    def _calculate_error_rate(self, metrics: List[Any]) -> float:
        """Calculate error rate from metrics"""
        error_metrics = [
            m for m in metrics
            if m.level in (ValidationLevel.ERROR, ValidationLevel.CRITICAL)
        ]
        return len(error_metrics) / len(metrics) if metrics else 0.0
    
    def _calculate_success_rate(self, metrics: List[Any]) -> float:
        """Calculate success rate from metrics"""
        success_metrics = [
            m for m in metrics
            if m.status == ValidationStatus.PASSED
        ]
        return len(success_metrics) / len(metrics) if metrics else 0.0
    
    def _extract_validation_times(self, metrics: List[Any]) -> List[float]:
        """Extract validation times from metrics"""
        return [
            m.value for m in metrics
            if m.type == MetricType.VALIDATION_TIME
        ]
    
    def _determine_health_status(
        self,
        error_rate: float,
        success_rate: float,
        validation_times: List[float]
    ) -> Dict[str, Any]:
        """Determine component health status"""
        if error_rate >= 0.25:  # More than 25% errors
            return {
                "status": "critical",
                "confidence": min(error_rate + 0.5, 1.0)
            }
        elif error_rate >= 0.1:  # More than 10% errors
            return {
                "status": "warning",
                "confidence": 0.7 + (error_rate * 2)
            }
        elif success_rate >= 0.95:  # More than 95% success
            return {
                "status": "healthy",
                "confidence": success_rate
            }
        elif success_rate >= 0.8:  # More than 80% success
            return {
                "status": "stable",
                "confidence": success_rate * 0.8
            }
        else:
            return {
                "status": "degraded",
                "confidence": max(0.5, success_rate)
            }
    
    async def analyze_validation_trends(
        self,
        component: str,
        metric_type: Optional[MetricType] = None,
        window_days: int = 7
    ) -> Dict[str, Any]:
        """
        Analyze validation metric trends
        
        Args:
            component: Component to analyze
            metric_type: Optional metric type filter
            window_days: Time window for analysis in days
            
        Returns:
            Trend analysis results
        """
        try:
            # Get metrics within window
            start_time = datetime.utcnow() - timedelta(days=window_days)
            metrics = await self.metrics.get_metrics(component, metric_type)
            window_metrics = [
                m for m in metrics
                if m.timestamp >= start_time
            ]
            
            if not window_metrics:
                return {
                    "trend": "unknown",
                    "confidence": 0.0,
                    "message": f"No metrics found in last {window_days} days"
                }
            
            # Group metrics by day
            daily_metrics = self._group_metrics_by_day(window_metrics)
            
            # Calculate daily averages
            daily_averages = {
                day: statistics.mean(m.value for m in day_metrics)
                for day, day_metrics in daily_metrics.items()
            }
            
            # Analyze trend
            trend = self._analyze_metric_trend(daily_averages)
            
            return {
                "trend": trend["direction"],
                "confidence": trend["confidence"],
                "daily_averages": daily_averages,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "trend": "error",
                "confidence": 0.0,
                "message": f"Trend analysis failed: {str(e)}"
            }
    
    def _group_metrics_by_day(self, metrics: List[Any]) -> Dict[str, List[Any]]:
        """Group metrics by day"""
        daily_metrics = defaultdict(list)
        for metric in metrics:
            day = metric.timestamp.date().isoformat()
            daily_metrics[day].append(metric)
        return dict(daily_metrics)
    
    def _analyze_metric_trend(self, daily_averages: Dict[str, float]) -> Dict[str, Any]:
        """Analyze trend in daily averages"""
        if len(daily_averages) < 2:
            return {
                "direction": "insufficient_data",
                "confidence": 0.0
            }
        
        # Calculate day-over-day changes
        days = sorted(daily_averages.keys())
        changes = [
            daily_averages[days[i]] - daily_averages[days[i-1]]
            for i in range(1, len(days))
        ]
        
        # Analyze trend direction
        positive_changes = sum(1 for c in changes if c > 0)
        negative_changes = sum(1 for c in changes if c < 0)
        total_changes = len(changes)
        
        if positive_changes > (total_changes * 0.7):
            return {
                "direction": "improving",
                "confidence": positive_changes / total_changes
            }
        elif negative_changes > (total_changes * 0.7):
            return {
                "direction": "degrading",
                "confidence": negative_changes / total_changes
            }
        else:
            return {
                "direction": "stable",
                "confidence": 0.5 + (abs(positive_changes - negative_changes) / (2 * total_changes))
            }

# Global instance
metrics_analyzer = MetricsAnalyzer()
