"""
Background Jobs Orchestrator
Manages comprehensive background job system while maintaining single source of truth
"""
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass
import logging
from pathlib import Path
import json
import yaml
from enum import Enum

from app.core.unified_critical_path import UnifiedCriticalPath
from app.core.final_validation_orchestrator import FinalValidationOrchestrator
from app.core.service_migration_orchestrator import ServiceMigrationOrchestrator
from app.core.supporting_services_orchestrator import SupportingServicesOrchestrator
from app.core.advanced_monitoring_orchestrator import AdvancedMonitoringOrchestrator
from app.core.advanced_analytics_orchestrator import AdvancedAnalyticsOrchestrator
from app.core.advanced_automation_orchestrator import AdvancedAutomationOrchestrator
from app.core.single_source_config import AppState
from app.validation.validation_types import ValidationResult
from app.services.metrics_service import MetricsService

class JobPriority(str, Enum):
    """Job priorities from SINGLE_SOURCE_VALIDATION.md"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class JobType(str, Enum):
    """Job types from SINGLE_SOURCE_VALIDATION.md"""
    MEDICATION_REMINDER = "medication_reminder"
    REFILL_CHECK = "refill_check"
    INTERACTION_CHECK = "interaction_check"
    SUPPLY_MONITOR = "supply_monitor"
    ANALYTICS_ROLL_UP = "analytics_roll_up"
    BACKUP = "backup"

@dataclass
class JobConfig:
    """Job configuration data class"""
    priority: JobPriority
    job_type: JobType
    schedule: Dict[str, Any]
    retry_policy: Dict[str, Any]
    timeout: int
    validation_rules: Dict[str, Any]
    monitoring_config: Dict[str, Any]
    evidence_path: str

@dataclass
class JobMetrics:
    """Job metrics data class"""
    execution_time: float
    success_rate: float
    error_rate: float
    retry_count: int
    timeout_count: int
    validation_status: Dict[str, Any]
    evidence: Dict[str, Any]
    timestamp: str

class BackgroundJobsOrchestrator:
    """
    Orchestrates background jobs processes
    Maintains single source of truth and validation
    """
    
    def __init__(self) -> None:
        """Initialize the background jobs orchestrator"""
        self.critical_path = UnifiedCriticalPath()
        self.metrics_service = MetricsService()
        self.validation = FinalValidationOrchestrator()
        self.service_migration = ServiceMigrationOrchestrator()
        self.supporting_services = SupportingServicesOrchestrator()
        self.monitoring = AdvancedMonitoringOrchestrator()
        self.analytics = AdvancedAnalyticsOrchestrator()
        self.automation = AdvancedAutomationOrchestrator()
        self.job_configs: Dict[str, JobConfig] = {}
        self.job_metrics: Dict[str, JobMetrics] = {}
        self.job_status: Dict[str, Any] = {}
        self.evidence_paths: Set[Path] = set()
        self.logger = logging.getLogger(__name__)
        
    async def register_job(
        self,
        job_id: str,
        priority: JobPriority,
        job_type: JobType,
        config: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Registers a new background job
        Maintains critical path alignment
        """
        # Validate critical path
        critical_validation = await self.critical_path.validate_critical_path(
            metrics=self.metrics_service,
            evidence=evidence
        )
        if not critical_validation.is_valid:
            raise ValueError("Critical path validation failed")
            
        # Create job config
        job_config = JobConfig(
            priority=priority,
            job_type=job_type,
            schedule=config.get('schedule', {}),
            retry_policy=config.get('retry_policy', {}),
            timeout=config.get('timeout', 300),
            validation_rules=config.get('validation_rules', {}),
            monitoring_config=config.get('monitoring_config', {}),
            evidence_path=config.get('evidence_path', '')
        )
        
        # Store job config
        self.job_configs[job_id] = job_config
        
        # Initialize metrics
        self.job_metrics[job_id] = JobMetrics(
            execution_time=0.0,
            success_rate=100.0,
            error_rate=0.0,
            retry_count=0,
            timeout_count=0,
            validation_status={},
            evidence={},
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Update evidence
        evidence['job_registration'] = {
            'job_id': job_id,
            'config': job_config.__dict__,
            'metrics': self.job_metrics[job_id].__dict__,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'registered'
        }
        
        return ValidationResult(
            is_valid=True,
            evidence=evidence
        )
        
    async def execute_job(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> ValidationResult:
        """
        Executes a background job
        Maintains critical path alignment
        """
        # Get job config
        job_config = self.job_configs.get(job_id)
        if not job_config:
            raise ValueError(f"Job {job_id} not found")
            
        # Validate critical path
        critical_validation = await self.critical_path.validate_critical_path(
            metrics=self.metrics_service,
            evidence=evidence
        )
        if not critical_validation.is_valid:
            raise ValueError("Critical path validation failed")
            
        try:
            # Execute job based on type
            if job_config.job_type == JobType.MEDICATION_REMINDER:
                await self._execute_medication_reminder(job_id, input_data, evidence)
            elif job_config.job_type == JobType.REFILL_CHECK:
                await self._execute_refill_check(job_id, input_data, evidence)
            elif job_config.job_type == JobType.INTERACTION_CHECK:
                await self._execute_interaction_check(job_id, input_data, evidence)
            elif job_config.job_type == JobType.SUPPLY_MONITOR:
                await self._execute_supply_monitor(job_id, input_data, evidence)
            elif job_config.job_type == JobType.ANALYTICS_ROLL_UP:
                await self._execute_analytics_roll_up(job_id, input_data, evidence)
            elif job_config.job_type == JobType.BACKUP:
                await self._execute_backup(job_id, input_data, evidence)
                
            # Update metrics
            metrics = self.job_metrics[job_id]
            metrics.success_rate = (metrics.success_rate * 99 + 100) / 100
            metrics.error_rate = (metrics.error_rate * 99) / 100
            metrics.timestamp = datetime.utcnow().isoformat()
            
            # Update evidence
            evidence['job_execution'] = {
                'job_id': job_id,
                'input': input_data,
                'metrics': metrics.__dict__,
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'completed'
            }
            
        except Exception as e:
            # Update metrics on failure
            metrics = self.job_metrics[job_id]
            metrics.error_rate = (metrics.error_rate * 99 + 100) / 100
            metrics.success_rate = (metrics.success_rate * 99) / 100
            metrics.retry_count += 1
            metrics.timestamp = datetime.utcnow().isoformat()
            
            # Update evidence
            evidence['job_execution'] = {
                'job_id': job_id,
                'input': input_data,
                'error': str(e),
                'metrics': metrics.__dict__,
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'failed'
            }
            
            raise
            
        return ValidationResult(
            is_valid=True,
            evidence=evidence
        )
        
    async def _execute_medication_reminder(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes medication reminder job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['user_id', 'medication_id', 'schedule']):
                raise ValueError("Missing required input data")

            # Get user preferences
            user_prefs = await self.service_migration.get_user_preferences(
                user_id=input_data['user_id'],
                evidence=evidence
            )

            # Check medication schedule
            schedule_check = await self.service_migration.check_medication_schedule(
                medication_id=input_data['medication_id'],
                schedule=input_data['schedule'],
                evidence=evidence
            )

            # Send notification if needed
            if schedule_check.should_notify:
                await self.service_migration.send_medication_notification(
                    user_id=input_data['user_id'],
                    medication_id=input_data['medication_id'],
                    notification_type='reminder',
                    preferences=user_prefs,
                    evidence=evidence
                )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.MEDICATION_REMINDER,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['medication_reminder'] = {
                'job_id': job_id,
                'user_id': input_data['user_id'],
                'medication_id': input_data['medication_id'],
                'schedule_check': schedule_check.__dict__,
                'notification_sent': schedule_check.should_notify,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Medication reminder job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.MEDICATION_REMINDER,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise

    async def _execute_refill_check(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes refill check job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['user_id', 'medication_id', 'current_supply']):
                raise ValueError("Missing required input data")

            # Get medication details
            medication = await self.service_migration.get_medication_details(
                medication_id=input_data['medication_id'],
                evidence=evidence
            )

            # Get current supply
            supply = await self.service_migration.get_medication_supply(
                medication_id=input_data['medication_id'],
                evidence=evidence
            )

            # Calculate days remaining
            days_remaining = supply.current_amount / medication.daily_usage if medication.daily_usage > 0 else float('inf')

            # Check if refill needed
            refill_needed = input_data['current_supply'] <= medication.refill_threshold

            if refill_needed:
                # Get user preferences
                user_prefs = await self.service_migration.get_user_preferences(
                    user_id=input_data['user_id'],
                    evidence=evidence
                )

                # Send refill notification
                await self.service_migration.send_medication_notification(
                    user_id=input_data['user_id'],
                    medication_id=input_data['medication_id'],
                    notification_type='refill',
                    preferences=user_prefs,
                    evidence=evidence
                )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.REFILL_CHECK,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['refill_check'] = {
                'job_id': job_id,
                'user_id': input_data['user_id'],
                'medication_id': input_data['medication_id'],
                'current_supply': input_data['current_supply'],
                'refill_threshold': medication.refill_threshold,
                'refill_needed': refill_needed,
                'notification_sent': refill_needed,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Refill check job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.REFILL_CHECK,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise

    async def _execute_interaction_check(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes interaction check job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['user_id', 'medications']):
                raise ValueError("Missing required input data")

            # Get medication details for all medications
            medications = []
            for med_id in input_data['medications']:
                med = await self.service_migration.get_medication_details(
                    medication_id=med_id,
                    evidence=evidence
                )
                medications.append(med)

            # Check for interactions
            interactions = await self.service_migration.check_medication_interactions(
                medications=medications,
                evidence=evidence
            )

            if interactions.has_interactions:
                # Get user preferences
                user_prefs = await self.service_migration.get_user_preferences(
                    user_id=input_data['user_id'],
                    evidence=evidence
                )

                # Send interaction notification
                await self.service_migration.send_medication_notification(
                    user_id=input_data['user_id'],
                    medication_ids=input_data['medications'],
                    notification_type='interaction',
                    interaction_data=interactions,
                    preferences=user_prefs,
                    evidence=evidence
                )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.INTERACTION_CHECK,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['interaction_check'] = {
                'job_id': job_id,
                'user_id': input_data['user_id'],
                'medications': input_data['medications'],
                'interactions_found': interactions.has_interactions,
                'interaction_details': interactions.__dict__,
                'notification_sent': interactions.has_interactions,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Interaction check job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.INTERACTION_CHECK,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise

    async def _execute_supply_monitor(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes supply monitor job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['user_id', 'medications']):
                raise ValueError("Missing required input data")

            supply_status = []
            critical_supplies = []

            # Check supply for each medication
            for med_id in input_data['medications']:
                # Get medication details
                med = await self.service_migration.get_medication_details(
                    medication_id=med_id,
                    evidence=evidence
                )

                # Get current supply
                supply = await self.service_migration.get_medication_supply(
                    medication_id=med_id,
                    evidence=evidence
                )

                # Calculate days remaining
                days_remaining = supply.current_amount / med.daily_usage if med.daily_usage > 0 else float('inf')

                status = {
                    'medication_id': med_id,
                    'current_supply': supply.current_amount,
                    'daily_usage': med.daily_usage,
                    'days_remaining': days_remaining,
                    'is_critical': days_remaining <= med.critical_supply_days
                }
                supply_status.append(status)

                if status['is_critical']:
                    critical_supplies.append(med_id)

            # Send notifications for critical supplies
            if critical_supplies:
                # Get user preferences
                user_prefs = await self.service_migration.get_user_preferences(
                    user_id=input_data['user_id'],
                    evidence=evidence
                )

                # Send supply alert
                await self.service_migration.send_medication_notification(
                    user_id=input_data['user_id'],
                    medication_ids=critical_supplies,
                    notification_type='critical_supply',
                    preferences=user_prefs,
                    evidence=evidence
                )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.SUPPLY_MONITOR,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['supply_monitor'] = {
                'job_id': job_id,
                'user_id': input_data['user_id'],
                'medications': input_data['medications'],
                'supply_status': supply_status,
                'critical_supplies': critical_supplies,
                'notification_sent': bool(critical_supplies),
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Supply monitor job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.SUPPLY_MONITOR,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise

    async def _execute_analytics_roll_up(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes analytics roll up job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['time_range', 'metrics_types']):
                raise ValueError("Missing required input data")

            analytics_data = {}

            # Collect medication adherence metrics
            if 'adherence' in input_data['metrics_types']:
                adherence_data = await self.analytics.collect_adherence_metrics(
                    time_range=input_data['time_range'],
                    evidence=evidence
                )
                analytics_data['adherence'] = adherence_data

            # Collect supply management metrics
            if 'supply' in input_data['metrics_types']:
                supply_data = await self.analytics.collect_supply_metrics(
                    time_range=input_data['time_range'],
                    evidence=evidence
                )
                analytics_data['supply'] = supply_data

            # Collect interaction safety metrics
            if 'safety' in input_data['metrics_types']:
                safety_data = await self.analytics.collect_safety_metrics(
                    time_range=input_data['time_range'],
                    evidence=evidence
                )
                analytics_data['safety'] = safety_data

            # Collect system performance metrics
            if 'performance' in input_data['metrics_types']:
                performance_data = await self.analytics.collect_performance_metrics(
                    time_range=input_data['time_range'],
                    evidence=evidence
                )
                analytics_data['performance'] = performance_data

            # Store analytics data
            await self.analytics.store_analytics_data(
                analytics_data=analytics_data,
                time_range=input_data['time_range'],
                evidence=evidence
            )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.ANALYTICS_ROLL_UP,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['analytics_roll_up'] = {
                'job_id': job_id,
                'time_range': input_data['time_range'],
                'metrics_types': input_data['metrics_types'],
                'analytics_summary': {k: len(v) for k, v in analytics_data.items()},
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Analytics roll up job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.ANALYTICS_ROLL_UP,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise

    async def _execute_backup(
        self,
        job_id: str,
        input_data: Dict[str, Any],
        evidence: Dict[str, Any]
    ) -> None:
        """
        Executes backup job
        Maintains critical path alignment
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate input data
            if not all(k in input_data for k in ['backup_type', 'storage_config']):
                raise ValueError("Missing required input data")

            backup_data = {}

            # Collect user data
            if input_data['backup_type'] in ['full', 'users']:
                user_data = await self.service_migration.collect_user_data(
                    evidence=evidence
                )
                backup_data['users'] = user_data

            # Collect medication data
            if input_data['backup_type'] in ['full', 'medications']:
                medication_data = await self.service_migration.collect_medication_data(
                    evidence=evidence
                )
                backup_data['medications'] = medication_data

            # Collect schedule data
            if input_data['backup_type'] in ['full', 'schedules']:
                schedule_data = await self.service_migration.collect_schedule_data(
                    evidence=evidence
                )
                backup_data['schedules'] = schedule_data

            # Collect analytics data
            if input_data['backup_type'] in ['full', 'analytics']:
                analytics_data = await self.service_migration.collect_analytics_data(
                    evidence=evidence
                )
                backup_data['analytics'] = analytics_data

            # Store backup
            backup_result = await self.service_migration.store_backup(
                backup_data=backup_data,
                storage_config=input_data['storage_config'],
                evidence=evidence
            )

            # Validate backup
            validation_result = await self.service_migration.validate_backup(
                backup_id=backup_result.backup_id,
                storage_config=input_data['storage_config'],
                evidence=evidence
            )

            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.BACKUP,
                execution_time=execution_time,
                status='success'
            )

            # Update evidence
            evidence['backup'] = {
                'job_id': job_id,
                'backup_type': input_data['backup_type'],
                'backup_id': backup_result.backup_id,
                'data_types': list(backup_data.keys()),
                'validation_result': validation_result.__dict__,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            # Log error
            self.logger.error(f"Backup job failed: {str(e)}")
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_service.track_job_execution(
                job_id=job_id,
                job_type=JobType.BACKUP,
                execution_time=execution_time,
                status='error',
                error=str(e)
            )
            
            raise
