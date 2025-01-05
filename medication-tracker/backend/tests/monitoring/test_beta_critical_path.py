"""
Beta Phase Critical Path Monitoring Tests
Last Updated: 2024-12-24T23:41:52+01:00
ValidationID: VALIDATION-BETA-MON-001
"""

import pytest
from datetime import datetime, timedelta
from prometheus_client import REGISTRY
from app.models.medication import Medication
from app.models.schedule import Schedule
from app.services.monitoring.metric_service import MetricService
from app.services.monitoring.alert_service import AlertService
from app.core.security import SecurityMetrics

class TestMedicationSafetyMonitoring:
    """Tests for medication safety monitoring - HIGHEST priority"""
    
    def test_schedule_execution_metrics(self, metric_service: MetricService):
        """
        VALIDATION-BETA-001: Schedule Execution Monitoring
        Critical Path: Medication Safety
        """
        # Arrange
        schedule = Schedule(medication_id=1, user_id=1)
        
        # Act
        metric_service.track_schedule_execution(schedule)
        
        # Assert
        metrics = REGISTRY.get_sample_value('medication_schedule_execution_total')
        assert metrics is not None, "Schedule execution metrics must be tracked"
        assert 'user_id' in metrics.labels, "User tracking required for HIPAA"

    def test_interaction_check_monitoring(self, metric_service: MetricService):
        """
        VALIDATION-BETA-002: Drug Interaction Monitoring
        Critical Path: Medication Safety
        """
        # Arrange
        medications = [Medication(id=1), Medication(id=2)]
        
        # Act
        metric_service.track_interaction_check(medications)
        
        # Assert
        metrics = REGISTRY.get_sample_value('medication_interaction_check_total')
        assert metrics is not None, "Interaction checks must be monitored"
        assert 'status' in metrics.labels, "Status tracking required"

class TestSecurityMonitoring:
    """Tests for security monitoring - HIGH priority"""
    
    def test_hipaa_compliance_metrics(self, security_metrics: SecurityMetrics):
        """
        VALIDATION-BETA-003: HIPAA Compliance Monitoring
        Critical Path: Data Security
        """
        # Arrange
        access_event = {
            'user_id': 1,
            'resource': 'medication_record',
            'action': 'view'
        }
        
        # Act
        security_metrics.track_phi_access(access_event)
        
        # Assert
        metrics = REGISTRY.get_sample_value('phi_access_total')
        assert metrics is not None, "PHI access must be monitored"
        assert 'action' in metrics.labels, "Action tracking required"

    def test_audit_trail_monitoring(self, security_metrics: SecurityMetrics):
        """
        VALIDATION-BETA-004: Audit Trail Monitoring
        Critical Path: Data Security
        """
        # Arrange
        audit_event = {
            'user_id': 1,
            'event_type': 'medication_update',
            'timestamp': datetime.now()
        }
        
        # Act
        security_metrics.track_audit_event(audit_event)
        
        # Assert
        metrics = REGISTRY.get_sample_value('audit_event_total')
        assert metrics is not None, "Audit events must be monitored"
        assert 'event_type' in metrics.labels, "Event type tracking required"

class TestInfrastructureMonitoring:
    """Tests for infrastructure monitoring - HIGH priority"""
    
    def test_api_performance_monitoring(self, metric_service: MetricService):
        """
        VALIDATION-BETA-005: API Performance Monitoring
        Critical Path: Core Infrastructure
        """
        # Arrange
        endpoint = '/api/v1/medications'
        
        # Act
        metric_service.track_api_performance(endpoint, 200)
        
        # Assert
        metrics = REGISTRY.get_sample_value('api_request_duration_seconds')
        assert metrics is not None, "API performance must be monitored"
        assert 'endpoint' in metrics.labels, "Endpoint tracking required"

    def test_database_performance_monitoring(self, metric_service: MetricService):
        """
        VALIDATION-BETA-006: Database Performance Monitoring
        Critical Path: Core Infrastructure
        """
        # Arrange
        query_type = 'medication_lookup'
        
        # Act
        metric_service.track_database_performance(query_type)
        
        # Assert
        metrics = REGISTRY.get_sample_value('database_query_duration_seconds')
        assert metrics is not None, "Database performance must be monitored"
        assert 'query_type' in metrics.labels, "Query type tracking required"
