"""
Validation Hook System Tests
Last Updated: 2024-12-25T11:38:43+01:00
Reference: VALIDATION_HOOK_SYSTEM.md
"""

import pytest
from datetime import datetime
from app.core.validation_hooks import ValidationHookSystem, ValidationLevel

class TestValidationHookSystem:
    """
    Tests for validation hook system.
    Ensures strict adherence to validation processes.
    """
    
    @pytest.fixture
    def hook_system(self):
        return ValidationHookSystem()
    
    def test_critical_path_validation(self, hook_system):
        """Test critical path validation"""
        change = {
            'type': 'feature',
            'name': 'medication_safety',
            'impact': 'CRITICAL',
            'validation': 'required'
        }
        
        assert hook_system.validate_critical_path(change), \
            "Critical path changes must be validated"
    
    def test_scope_creep_detection(self, hook_system):
        """Test scope creep detection"""
        feature = {
            'name': 'non_critical_feature',
            'priority': 'LOW',
            'path': 'not_in_critical_path'
        }
        
        warning = hook_system.check_scope_creep(feature)
        assert warning is not None, \
            "Scope creep must be detected"
        assert "not in critical path" in warning.lower(), \
            "Warning must indicate scope issue"
    
    def test_documentation_validation(self, hook_system, tmp_path):
        """Test documentation validation"""
        doc_file = tmp_path / "test_doc.md"
        doc_file.write_text("""
        # Test Document
        Reference: MASTER_CRITICAL_PATH.md
        
        ## Content
        This document follows critical path.
        """)
        
        assert hook_system.validate_documentation(str(doc_file)), \
            "Valid documentation must be accepted"
    
    def test_validation_chain_tracking(self, hook_system):
        """Test validation chain maintenance"""
        step = {
            'name': 'test_step',
            'type': 'validation',
            'status': 'complete'
        }
        
        hook_system.track_validation_chain(step)
        assert len(hook_system.validation_chain) == 1, \
            "Validation chain must be maintained"
        assert hook_system.validation_chain[0]['validated'], \
            "Validation status must be tracked"
    
    def test_user_approval_request(self, hook_system):
        """Test user approval request formatting"""
        change = {
            'type': 'security_update',
            'impact': 'HIGH',
            'validation': 'pending',
            'documentation': ['doc1.md', 'doc2.md'],
            'options': [
                'Proceed with update',
                'Delay for review'
            ]
        }
        
        request = hook_system.request_user_approval(change)
        assert "Change Request" in request, \
            "Request must be properly formatted"
        assert "Options:" in request, \
            "Options must be presented"
