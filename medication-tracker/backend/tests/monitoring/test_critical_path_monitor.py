"""
Critical Path Monitor Tests
Last Updated: 2024-12-25T11:53:10+01:00
Permission: IMPLEMENTATION
Scope: CODE
Reference: MASTER_CRITICAL_PATH.md
Parent: VALIDATION_HOOK_SYSTEM.md
"""

import pytest
from datetime import datetime
from app.monitoring.critical_path_monitor import CriticalPathMonitor, CriticalPathMetric

class TestCriticalPathMonitor:
    """
    Test suite for critical path monitoring
    Ensures alignment with MASTER_CRITICAL_PATH.md
    """
    
    @pytest.fixture
    def monitor(self):
        return CriticalPathMonitor()
    
    def test_schedule_management_monitoring(self, monitor):
        """
        Test schedule management monitoring
        Critical Path: Medication Safety > Schedule Management
        """
        # Test data
        schedule_data = {
            'total_schedules': 100,
            'accurate_schedules': 98,
            'timestamp': datetime.now()
        }
        
        # Monitor schedule
        monitor.monitor_schedule_management(schedule_data)
        
        # Verify metrics
        assert monitor.validation_status['schedule_management'].value == 98.0
        assert monitor.validation_status['schedule_management'].priority == 'HIGHEST'
        assert monitor.validation_status['schedule_management'].validation_status
    
    def test_interaction_checking_monitoring(self, monitor):
        """
        Test interaction checking monitoring
        Critical Path: Medication Safety > Interaction Checking
        """
        # Test data
        interaction_data = {
            'conflict_detected': True,
            'severity': 'HIGH',
            'timestamp': datetime.now()
        }
        
        # Monitor interaction
        monitor.monitor_interaction_checking(interaction_data)
        
        # Verify metrics
        assert monitor.validation_status['interaction_checking'].value == 1.0
        assert monitor.validation_status['interaction_checking'].priority == 'HIGHEST'
        assert monitor.validation_status['interaction_checking'].validation_status
    
    def test_security_compliance_monitoring(self, monitor):
        """
        Test security compliance monitoring
        Critical Path: Data Security > HIPAA Compliance
        """
        # Test data
        security_data = {
            'compliance_checks': [
                {'check': 'encryption', 'passed': True},
                {'check': 'access_control', 'passed': True},
                {'check': 'audit_logging', 'passed': True}
            ],
            'timestamp': datetime.now()
        }
        
        # Monitor security
        monitor.monitor_security_compliance(security_data)
        
        # Verify metrics
        assert monitor.validation_status['security_compliance'].value == 100.0
        assert monitor.validation_status['security_compliance'].priority == 'HIGH'
        assert monitor.validation_status['security_compliance'].validation_status
    
    def test_system_health_monitoring(self, monitor):
        """
        Test system health monitoring
        Critical Path: Core Infrastructure > System Health
        """
        # Test data
        health_data = {
            'health_metrics': {
                'cpu_usage': 0.7,
                'memory_usage': 0.6,
                'disk_usage': 0.5,
                'network_health': 0.9
            },
            'timestamp': datetime.now()
        }
        
        # Monitor health
        monitor.monitor_system_health(health_data)
        
        # Verify metrics
        assert monitor.validation_status['system_health'].value == 0.675
        assert monitor.validation_status['system_health'].priority == 'HIGH'
        assert monitor.validation_status['system_health'].validation_status
    
    def test_critical_error_handling(self, monitor):
        """
        Test critical error handling
        Ensures proper error tracking and validation
        """
        # Simulate error
        try:
            raise ValueError("Critical test error")
        except Exception as e:
            monitor._handle_critical_error('test_component', e)
        
        # Verify error handling
        assert not monitor.validation_status['test_component'].validation_status
        assert monitor.validation_status['test_component'].priority == 'HIGHEST'
        assert monitor.validation_status['test_component'].value == 0.0
    
    def test_evidence_collection(self, monitor):
        """
        Test evidence collection
        Ensures proper validation trail
        """
        # Test data
        component = 'test_evidence'
        value = 95.0
        priority = 'HIGH'
        
        # Collect evidence
        monitor._validate_and_collect_evidence(component, value, priority)
        
        # Verify evidence
        evidence = monitor.validation_status[component]
        assert isinstance(evidence, CriticalPathMetric)
        assert evidence.name == component
        assert evidence.value == value
        assert evidence.priority == priority
        assert evidence.validation_status
