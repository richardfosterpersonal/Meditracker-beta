"""
Validation Chain Tests
Critical Path: VALIDATION-TESTS
Last Updated: 2025-01-02T14:13:50+01:00
"""

import pytest
from datetime import datetime
from typing import Dict

from ..app.core.unified_validation_framework import UnifiedValidationFramework
from ..app.models.validation import ValidationStatus, ValidationPriority

@pytest.fixture
def framework():
    """Create test framework instance"""
    return UnifiedValidationFramework()

@pytest.fixture
def test_validation():
    """Create test validation data"""
    return {
        "id": "TEST-VAL-1",
        "name": "Test Validation",
        "type": "test",
        "priority": ValidationPriority.HIGH,
        "status": ValidationStatus.PENDING,
        "requirements": {
            "test_field": "test_value"
        },
        "metadata": {
            "test_meta": "test_value"
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

def test_validation_creation(framework, test_validation):
    """Test creating a new validation"""
    validation = framework.register_validation(test_validation)
    assert validation["id"] == test_validation["id"]
    assert validation["status"] == ValidationStatus.PENDING

def test_validation_update(framework, test_validation):
    """Test updating validation status"""
    framework.register_validation(test_validation)
    
    updated = framework.update_validation({
        **test_validation,
        "status": ValidationStatus.COMPLETED
    })
    
    assert updated["status"] == ValidationStatus.COMPLETED
    assert updated["updated_at"] > test_validation["updated_at"]

def test_validation_chain(framework):
    """Test validation chain execution"""
    # Create chain of validations
    validations = [
        {
            "id": f"CHAIN-{i}",
            "name": f"Chain Test {i}",
            "type": "chain_test",
            "priority": ValidationPriority.HIGH,
            "status": ValidationStatus.PENDING,
            "requirements": {"chain_pos": i},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        for i in range(3)
    ]
    
    # Register all validations
    for validation in validations:
        framework.register_validation(validation)
    
    # Run validation chain
    result = framework.validate({
        "chain": "test",
        "requirements": {
            "chain_complete": True
        }
    })
    
    assert result["valid"]
    
    # Check all validations completed
    for validation in framework.get_validations():
        assert validation["status"] == ValidationStatus.COMPLETED

def test_validation_requirements(framework, test_validation):
    """Test validation requirements checking"""
    framework.register_validation(test_validation)
    
    # Test with matching requirements
    result = framework.validate({
        "validation_id": test_validation["id"],
        "requirements": {
            "test_field": "test_value"
        }
    })
    assert result["valid"]
    
    # Test with non-matching requirements
    result = framework.validate({
        "validation_id": test_validation["id"],
        "requirements": {
            "test_field": "wrong_value"
        }
    })
    assert not result["valid"]

def test_validation_sync(framework):
    """Test synchronous validation chain"""
    # Create dependent validations
    parent = {
        "id": "PARENT-1",
        "name": "Parent Test",
        "type": "parent_test",
        "priority": ValidationPriority.HIGH,
        "status": ValidationStatus.PENDING,
        "requirements": {},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    child = {
        "id": "CHILD-1",
        "name": "Child Test",
        "type": "child_test",
        "priority": ValidationPriority.HIGH,
        "status": ValidationStatus.PENDING,
        "requirements": {
            "parent_completed": True
        },
        "metadata": {
            "parent_id": "PARENT-1"
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Register validations
    framework.register_validation(parent)
    framework.register_validation(child)
    
    # Run parent validation
    framework.validate({
        "validation_id": parent["id"],
        "requirements": {}
    })
    
    # Verify parent completed
    parent_result = framework.get_validation(parent["id"])
    assert parent_result["status"] == ValidationStatus.COMPLETED
    
    # Run child validation
    framework.validate({
        "validation_id": child["id"],
        "requirements": {
            "parent_completed": True
        }
    })
    
    # Verify child completed
    child_result = framework.get_validation(child["id"])
    assert child_result["status"] == ValidationStatus.COMPLETED
