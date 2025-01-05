"""
Beta Metrics Collection System
Critical Path: BETA-METRICS-*
Last Updated: 2025-01-02T12:43:13+01:00

Collects and analyzes metrics during beta testing.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from pathlib import Path
import asyncio
import statistics

from backend.app.exceptions import BetaMetricsError

logger = logging.getLogger(__name__)

class BetaMetrics:
    """Collects and analyzes metrics during beta testing"""
    
    def __init__(self, metrics_dir: Path):
        """Initialize beta metrics collector"""
        self.metrics_dir = metrics_dir
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        
    async def record_metric(self, category: str, name: str, value: Any):
        """Record a metric value"""
        async with self._lock:
            try:
                timestamp = datetime.utcnow().isoformat()
                metric = {
                    "category": category,
                    "name": name,
                    "value": value,
                    "timestamp": timestamp
                }
                
                # Store in category-specific file
                metric_file = self.metrics_dir / f"{category}_{timestamp[:10]}.json"
                
                if metric_file.exists():
                    with open(metric_file) as f:
                        metrics = json.load(f)
                else:
                    metrics = []
                    
                metrics.append(metric)
                
                with open(metric_file, 'w') as f:
                    json.dump(metrics, f, indent=2)
                    
                logger.info(f"Recorded metric: {category}.{name}")
                
            except Exception as e:
                logger.error(f"Failed to record metric: {str(e)}")
                raise BetaMetricsError("Failed to record metric") from e
                
    def get_metrics(self, category: str, name: Optional[str] = None, 
                   start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        """Get metrics within specified criteria"""
        try:
            metrics = []
            metric_files = list(self.metrics_dir.glob(f"{category}_*.json"))
            
            for file in metric_files:
                # Check if file is within date range
                file_date = file.stem.split('_')[1]
                if start_date and file_date < start_date:
                    continue
                if end_date and file_date > end_date:
                    continue
                    
                with open(file) as f:
                    file_metrics = json.load(f)
                    
                if name:
                    file_metrics = [m for m in file_metrics if m["name"] == name]
                    
                metrics.extend(file_metrics)
                
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {str(e)}")
            raise BetaMetricsError("Failed to get metrics") from e
            
    def analyze_metrics(self, category: str, name: str,
                       start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict:
        """Analyze metrics for a specific category and name"""
        try:
            metrics = self.get_metrics(category, name, start_date, end_date)
            values = [m["value"] for m in metrics if isinstance(m["value"], (int, float))]
            
            if not values:
                return {
                    "count": 0,
                    "message": "No numeric values found for analysis"
                }
                
            return {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "stdev": statistics.stdev(values) if len(values) > 1 else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze metrics: {str(e)}")
            raise BetaMetricsError("Failed to analyze metrics") from e
