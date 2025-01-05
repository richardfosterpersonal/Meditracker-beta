"""
Beta Data Collector
Last Updated: 2025-01-01T19:10:40+01:00
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import asyncio
from .logging import beta_logger
from .validation_metrics import ValidationMetric
from .critical_path_validator import CriticalPathValidator
from .beta_critical_path import BetaCriticalPath
from ..models.user import User
from ..models.metrics import Metrics
from ..models.validation import Validation

class DataPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BetaDataCollector:
    """
    Collects and processes beta monitoring data
    Ensures critical path alignment and safety validation
    """
    
    def __init__(self):
        self.logger = beta_logger
        self.validation_metric = ValidationMetric(type="beta_validation", value=0)
        self.critical_path_validator = CriticalPathValidator()
        self.critical_path = BetaCriticalPath()
        
    async def collect_user_metrics(self, user_id: str) -> Dict:
        """Collect comprehensive user metrics"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                f"metrics_collection_{user_id}",
                DataPriority.HIGH
            )
            
            # Collect activity data
            activity = await self._collect_activity_data(user_id)
            if not activity["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect activity data",
                    activity["error"]
                )
                
            # Collect safety metrics
            safety = await self._collect_safety_metrics(user_id)
            if not safety["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect safety metrics",
                    safety["error"]
                )
                
            # Collect critical path data
            critical_path = await self._collect_critical_path_data(user_id)
            if not critical_path["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect critical path data",
                    critical_path["error"]
                )
                
            # Process and validate collected data
            processed_data = await self._process_collected_data(
                activity["data"],
                safety["data"],
                critical_path["data"]
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "success",
                "validation_id": validation_id,
                "metrics": processed_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "metrics_collection_failed",
                error=str(e),
                user_id=user_id
            )
            raise
            
    async def collect_system_metrics(self) -> Dict:
        """Collect system-wide metrics"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                "system_metrics_collection",
                DataPriority.HIGH
            )
            
            # Collect performance metrics
            performance = await self._collect_performance_metrics()
            if not performance["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect performance metrics",
                    performance["error"]
                )
                
            # Collect safety metrics
            safety = await self._collect_system_safety_metrics()
            if not safety["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect safety metrics",
                    safety["error"]
                )
                
            # Collect critical path metrics
            critical_path = await self._collect_system_critical_path_metrics()
            if not critical_path["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect critical path metrics",
                    critical_path["error"]
                )
                
            # Process and validate system data
            processed_data = await self._process_system_data(
                performance["data"],
                safety["data"],
                critical_path["data"]
            )
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "success",
                "validation_id": validation_id,
                "metrics": processed_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "system_metrics_collection_failed",
                error=str(e)
            )
            raise
            
    async def collect_safety_data(self, user_id: Optional[str] = None) -> Dict:
        """Collect safety-related data"""
        try:
            # Start validation chain
            validation_id = await self._start_validation_chain(
                "safety_data_collection",
                DataPriority.CRITICAL
            )
            
            # Collect safety metrics
            if user_id:
                safety = await self._collect_user_safety_data(user_id)
            else:
                safety = await self._collect_system_safety_data()
                
            if not safety["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Failed to collect safety data",
                    safety["error"]
                )
                
            # Validate safety data
            validation = await self._validate_safety_data(safety["data"])
            if not validation["valid"]:
                return self._handle_collection_failure(
                    validation_id,
                    "Safety data validation failed",
                    validation["error"]
                )
                
            # Process safety data
            processed_data = await self._process_safety_data(safety["data"])
            
            # Complete validation chain
            await self._complete_validation_chain(validation_id, "success")
            
            return {
                "status": "success",
                "validation_id": validation_id,
                "safety_data": processed_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(
                "safety_data_collection_failed",
                error=str(e),
                user_id=user_id
            )
            raise
            
    # Helper methods
    async def _start_validation_chain(
        self,
        operation: str,
        priority: DataPriority
    ) -> str:
        """Start validation chain for data collection"""
        return await self.critical_path_validator.start_validation(operation, priority)
        
    async def _complete_validation_chain(
        self,
        validation_id: str,
        status: str
    ) -> None:
        """Complete validation chain"""
        await self.critical_path_validator.complete_validation(validation_id, status)
        
    def _handle_collection_failure(
        self,
        validation_id: str,
        reason: str,
        error: Dict
    ) -> Dict:
        """Handle data collection failure"""
        return {
            "status": "failed",
            "validation_id": validation_id,
            "reason": reason,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    async def _collect_activity_data(self, user_id: str) -> Dict:
        """Collect user activity data"""
        # Implementation
        pass
        
    async def _collect_safety_metrics(self, user_id: str) -> Dict:
        """Collect user safety metrics"""
        # Implementation
        pass
        
    async def _collect_critical_path_data(self, user_id: str) -> Dict:
        """Collect user critical path data"""
        # Implementation
        pass
        
    async def _process_collected_data(
        self,
        activity: Dict,
        safety: Dict,
        critical_path: Dict
    ) -> Dict:
        """Process and validate collected data"""
        # Implementation
        pass
        
    async def _collect_performance_metrics(self) -> Dict:
        """Collect system performance metrics"""
        try:
            # Get API metrics
            api_metrics = await Metrics.get_api_metrics()
            
            # Get system metrics
            system_metrics = await Metrics.get_system_metrics()
            
            # Calculate API response time (95th percentile)
            response_times = api_metrics.get("response_times", [])
            p95_response = sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 1000
            
            # Calculate error rate
            total_requests = api_metrics.get("total_requests", 0)
            total_errors = api_metrics.get("total_errors", 0)
            error_rate = total_errors / total_requests if total_requests > 0 else 1
            
            # Calculate uptime
            start_time = system_metrics.get("start_time")
            if start_time:
                uptime_duration = datetime.utcnow() - datetime.fromisoformat(start_time)
                uptime_percentage = (uptime_duration.total_seconds() / (24 * 60 * 60)) * 100
            else:
                uptime_percentage = 0
            
            return {
                "valid": True,
                "data": {
                    "api_p95_response": p95_response,
                    "error_rate": error_rate,
                    "uptime_percentage": uptime_percentage,
                    "cpu_usage": system_metrics.get("cpu_usage", 100),
                    "memory_usage": system_metrics.get("memory_usage", 100)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect performance metrics: {str(e)}")
            return {
                "valid": False,
                "error": {
                    "message": "Failed to collect performance metrics",
                    "details": str(e)
                }
            }
            
    async def _collect_system_safety_metrics(self) -> Dict:
        """Collect system safety metrics"""
        try:
            # Get database metrics
            db_metrics = await Metrics.get_database_metrics()
            
            # Get validation metrics
            validation_metrics = await Metrics.get_validation_metrics()
            
            # Calculate data integrity score
            total_validations = validation_metrics.get("total_validations", 0)
            passed_validations = validation_metrics.get("passed_validations", 0)
            integrity_score = passed_validations / total_validations if total_validations > 0 else 0
            
            # Calculate backup success rate
            total_backups = db_metrics.get("total_backups", 0)
            successful_backups = db_metrics.get("successful_backups", 0)
            backup_success_rate = successful_backups / total_backups if total_backups > 0 else 0
            
            return {
                "valid": True,
                "data": {
                    "data_integrity_score": integrity_score,
                    "backup_success_rate": backup_success_rate,
                    "validation_success_rate": integrity_score,
                    "database_health": db_metrics.get("health_score", 0)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect safety metrics: {str(e)}")
            return {
                "valid": False,
                "error": {
                    "message": "Failed to collect safety metrics",
                    "details": str(e)
                }
            }
            
    async def _collect_system_critical_path_metrics(self) -> Dict:
        """Collect system critical path metrics"""
        try:
            # Get validation metrics
            validation_metrics = await Metrics.get_validation_metrics()
            
            # Get critical path metrics
            critical_path_metrics = await Metrics.get_critical_path_metrics()
            
            # Calculate critical path completion
            total_steps = critical_path_metrics.get("total_steps", 0)
            completed_steps = critical_path_metrics.get("completed_steps", 0)
            completion_rate = completed_steps / total_steps if total_steps > 0 else 0
            
            # Calculate validation success rate
            total_validations = validation_metrics.get("total_validations", 0)
            passed_validations = validation_metrics.get("passed_validations", 0)
            validation_rate = passed_validations / total_validations if total_validations > 0 else 0
            
            return {
                "valid": True,
                "data": {
                    "completion_rate": completion_rate,
                    "validation_rate": validation_rate,
                    "health_score": critical_path_metrics.get("health_score", 0),
                    "risk_score": critical_path_metrics.get("risk_score", 1)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect critical path metrics: {str(e)}")
            return {
                "valid": False,
                "error": {
                    "message": "Failed to collect critical path metrics",
                    "details": str(e)
                }
            }
            
    async def _process_system_data(
        self,
        performance: Dict,
        safety: Dict,
        critical_path: Dict
    ) -> Dict:
        """Process and validate system data"""
        return {
            "performance": {
                "api_response": performance.get("api_p95_response", 1000),
                "error_rate": performance.get("error_rate", 1),
                "uptime": performance.get("uptime_percentage", 0),
                "resource_usage": {
                    "cpu": performance.get("cpu_usage", 100),
                    "memory": performance.get("memory_usage", 100)
                }
            },
            "safety": {
                "data_integrity": safety.get("data_integrity_score", 0),
                "backup_reliability": safety.get("backup_success_rate", 0),
                "validation_success": safety.get("validation_success_rate", 0),
                "database_health": safety.get("database_health", 0)
            },
            "critical_path": {
                "completion": critical_path.get("completion_rate", 0),
                "validation": critical_path.get("validation_rate", 0),
                "health": critical_path.get("health_score", 0),
                "risk": critical_path.get("risk_score", 1)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    async def _collect_user_safety_data(self, user_id: str) -> Dict:
        """Collect user safety data"""
        # Implementation
        pass
        
    async def _collect_system_safety_data(self) -> Dict:
        """Collect system safety data"""
        # Implementation
        pass
        
    async def _validate_safety_data(self, data: Dict) -> Dict:
        """Validate collected safety data"""
        # Implementation
        pass
        
    async def _process_safety_data(self, data: Dict) -> Dict:
        """Process safety data"""
        # Implementation
        pass
