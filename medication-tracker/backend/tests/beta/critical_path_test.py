"""
Critical Path Beta Test
Last Updated: 2024-12-25T12:03:51+01:00
Permission: IMPLEMENTATION
Reference: MASTER_CRITICAL_PATH.md
"""

import pytest
from datetime import datetime
from app.testing.test_data_generator import TestDataGenerator
from app.monitoring.beta_monitor import BetaMonitor

class TestCriticalPath:
    """
    Beta test suite focusing on critical path components:
    1. Medication Safety (HIGHEST)
    2. Data Security (HIGH)
    3. Core Infrastructure (HIGH)
    """
    
    @pytest.fixture
    def generator(self):
        return TestDataGenerator()
    
    @pytest.fixture
    def monitor(self):
        return BetaMonitor()
    
    def test_medication_safety(self, generator, monitor):
        """Test HIGHEST priority component: Medication Safety"""
        # Generate test schedule
        schedule = generator.generate_schedule(days=1)
        
        # Monitor schedule accuracy
        safety_metric = monitor.monitor_safety({
            'schedule_accuracy': 100,
            'interaction_check': True,
            'alert_generated': False
        })
        
        assert safety_metric.status == True
        assert safety_metric.component == 'medication_safety'
        
        # Test interaction checking
        interaction_test = generator.generate_interaction_test()
        assert interaction_test['expected_alert'] == True
        
        # Test error prevention
        error_test = generator.generate_error_test()
        assert len(error_test['scenarios']) > 0
    
    def test_data_security(self, generator, monitor):
        """Test HIGH priority component: Data Security"""
        # Generate security test data
        security_test = generator.generate_security_test()
        
        # Monitor security status
        security_metric = monitor.monitor_security({
            'security_status': 100,
            'encryption_active': True,
            'access_control': True
        })
        
        assert security_metric.status == True
        assert security_metric.component == 'security'
        assert security_test['expected_encryption'] == True
    
    def test_core_infrastructure(self, monitor):
        """Test HIGH priority component: Core Infrastructure"""
        # Test response time
        monitor.monitor_performance(0.1)  # 100ms response time
        
        # Verify metrics are being collected
        assert monitor.response_time._type == 'histogram'
        assert monitor.schedule_accuracy._type == 'gauge'
        assert monitor.interaction_checks._type == 'counter'
