"""
Integration Tests for Medication Interaction Monitoring
Last Updated: 2024-12-25T21:34:49+01:00
Status: CRITICAL
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
"""

import pytest
from datetime import datetime, timezone
from app.services.interaction_monitor_service import InteractionMonitorService
from app.validation.medication_safety import MedicationSafetyValidator

@pytest.fixture
def monitor_service():
    return InteractionMonitorService()

@pytest.fixture
def safety_validator():
    return MedicationSafetyValidator()

def test_severe_interaction_monitoring():
    """Test monitoring of severe drug interactions."""
    monitor = InteractionMonitorService()
    
    # Simulate severe interaction
    interaction = {
        'severity': 'SEVERE',
        'type': 'drug_drug',
        'risk': 'Increased bleeding risk',
        'mechanism': 'Additive anticoagulant effects'
    }
    
    plan = monitor.monitor_interaction(interaction)
    
    assert plan['status'] == 'active'
    assert plan['severity'] == 'SEVERE'
    assert plan['alert_frequency'] == 'immediate'
    assert 'Immediate provider notification' in plan['required_actions']
    assert plan['evidence_requirements']['retention_period'] == '7_years'

def test_herb_drug_interaction_monitoring():
    """Test monitoring of herb-drug interactions."""
    monitor = InteractionMonitorService()
    
    # Simulate herb-drug interaction
    interaction = {
        'severity': 'MODERATE',
        'type': 'herb_drug',
        'risk': 'Increased bleeding risk',
        'mechanism': 'Antiplatelet effects'
    }
    
    plan = monitor.monitor_interaction(interaction)
    
    assert plan['status'] == 'active'
    assert plan['severity'] == 'MODERATE'
    assert plan['alert_frequency'] == 'daily'
    assert 'Provider notification within 24 hours' in plan['required_actions']

def test_monitoring_integration_with_validation():
    """Test integration between validation and monitoring."""
    validator = MedicationSafetyValidator()
    
    # Test medications with known interaction
    medications = [
        {'name': 'warfarin', 'dosage': '5mg'},
        {'name': 'aspirin', 'dosage': '81mg'}
    ]
    
    result = validator.validate_interactions(medications)
    
    assert result['validation_status'] == 'complete'
    assert len(result.get('monitoring_plans', [])) > 0
    
    plan = result['monitoring_plans'][0]
    assert plan['severity'] == 'SEVERE'
    assert 'Immediate provider notification' in plan['required_actions']

def test_evidence_requirements():
    """Test evidence collection requirements."""
    monitor = InteractionMonitorService()
    
    interaction = {
        'severity': 'SEVERE',
        'type': 'drug_drug',
        'risk': 'Critical interaction'
    }
    
    plan = monitor.monitor_interaction(interaction)
    evidence_reqs = plan['evidence_requirements']
    
    assert evidence_reqs['documentation_required'] is True
    assert evidence_reqs['retention_period'] == '7_years'
    assert 'timestamp' in evidence_reqs['required_fields']
    assert 'provider_notifications' in evidence_reqs['required_fields']

def test_metric_collection():
    """Test monitoring metric collection."""
    monitor = InteractionMonitorService()
    
    # Test severe interaction
    severe_interaction = {
        'severity': 'SEVERE',
        'type': 'drug_drug',
        'risk': 'Critical interaction'
    }
    
    monitor.monitor_interaction(severe_interaction)
    
    # Get metric values (using private method for testing)
    severe_count = monitor.interaction_counter.labels(
        severity='SEVERE',
        type='drug_drug'
    )._value.get()
    
    assert severe_count == 1
    
    # Test active interactions gauge
    active_severe = monitor.active_interactions.labels(
        severity='SEVERE',
        type='drug_drug'
    )._value.get()
    
    assert active_severe == 1

def test_monitoring_deactivation():
    """Test proper deactivation of monitoring."""
    monitor = InteractionMonitorService()
    
    # Setup active monitoring
    interaction = {
        'severity': 'SEVERE',
        'type': 'drug_drug',
        'risk': 'Critical interaction'
    }
    
    plan = monitor.monitor_interaction(interaction)
    
    # Deactivate monitoring using the plan's ID
    monitor.deactivate_monitoring(plan['id'])
    
    # Verify gauge was decremented
    active_severe = monitor.active_interactions.labels(
        severity='SEVERE',
        type='drug_drug'
    )._value.get()
    
    assert active_severe == 0
