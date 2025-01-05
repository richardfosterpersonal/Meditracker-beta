"""
Performance Monitoring System
Last Updated: 2024-12-25T12:27:36+01:00
Permission: SYSTEM
Reference: MASTER_CRITICAL_PATH.md
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
import psutil
import time
from dataclasses import dataclass
from statistics import mean, median

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    timestamp: datetime
    metric_type: str
    value: float
    unit: str
    context: Dict

class PerformanceMonitor:
    """System performance monitoring"""
    
    def __init__(self):
        self.logger = self._setup_logger()
        self.metrics: List[PerformanceMetric] = []
        self.start_time = datetime.now()
    
    def _setup_logger(self) -> logging.Logger:
        """Setup performance logging"""
        logger = logging.getLogger('performance_monitor')
        logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - '
            '%(message)s - Reference: MASTER_CRITICAL_PATH.md'
        )
        
        handler = logging.FileHandler('logs/performance.log')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    def collect_system_metrics(self) -> Dict:
        """Collect system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self._record_metric(
                metric_type="cpu_usage",
                value=cpu_percent,
                unit="percent",
                context={"cores": psutil.cpu_count()}
            )
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self._record_metric(
                metric_type="memory_usage",
                value=memory.percent,
                unit="percent",
                context={"total": memory.total}
            )
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            self._record_metric(
                metric_type="disk_usage",
                value=disk.percent,
                unit="percent",
                context={"total": disk.total}
            )
            
            self.logger.info("System metrics collected successfully")
            return self.get_current_metrics()
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {str(e)}")
            return {}
    
    def _record_metric(self,
                      metric_type: str,
                      value: float,
                      unit: str,
                      context: Dict) -> None:
        """Record a performance metric"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type=metric_type,
            value=value,
            unit=unit,
            context=context
        )
        self.metrics.append(metric)
    
    def get_current_metrics(self) -> Dict:
        """Get current performance metrics"""
        current_metrics = {}
        for metric in self.metrics[-3:]:  # Last 3 metrics
            current_metrics[metric.metric_type] = {
                "value": metric.value,
                "unit": metric.unit,
                "timestamp": metric.timestamp.isoformat()
            }
        return current_metrics
    
    def get_metric_history(self,
                          metric_type: str,
                          hours: Optional[int] = 24) -> List[Dict]:
        """Get historical metrics"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            {
                "value": m.value,
                "unit": m.unit,
                "timestamp": m.timestamp.isoformat()
            }
            for m in self.metrics
            if m.metric_type == metric_type
            and m.timestamp >= cutoff_time
        ]
    
    def analyze_performance(self) -> Dict:
        """Analyze system performance"""
        analysis = {}
        
        for metric_type in ["cpu_usage", "memory_usage", "disk_usage"]:
            metrics = self.get_metric_history(metric_type)
            if metrics:
                values = [m["value"] for m in metrics]
                analysis[metric_type] = {
                    "current": values[-1],
                    "average": mean(values),
                    "median": median(values),
                    "min": min(values),
                    "max": max(values)
                }
        
        return analysis
    
    def get_performance_report(self) -> Dict:
        """Generate performance report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600,
            "current_metrics": self.get_current_metrics(),
            "analysis": self.analyze_performance(),
            "status": self._determine_system_status()
        }
    
    def _determine_system_status(self) -> str:
        """Determine overall system status"""
        try:
            metrics = self.get_current_metrics()
            
            # Check for critical thresholds
            if (metrics.get("cpu_usage", {}).get("value", 0) > 90 or
                metrics.get("memory_usage", {}).get("value", 0) > 90 or
                metrics.get("disk_usage", {}).get("value", 0) > 90):
                return "CRITICAL"
            
            # Check for warning thresholds
            if (metrics.get("cpu_usage", {}).get("value", 0) > 70 or
                metrics.get("memory_usage", {}).get("value", 0) > 70 or
                metrics.get("disk_usage", {}).get("value", 0) > 70):
                return "WARNING"
            
            return "HEALTHY"
            
        except Exception as e:
            self.logger.error(f"Error determining system status: {str(e)}")
            return "UNKNOWN"
