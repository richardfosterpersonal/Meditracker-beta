"""
Phase 2 Security Enhancement Tests
Last Updated: 2024-12-25T12:17:27+01:00
Permission: CORE
Reference: MASTER_CRITICAL_PATH.md
"""

import pytest
from datetime import datetime, timedelta
from app.security.hipaa_compliance import (
    HIPAACompliance, PHILevel, AccessLevel, PHIAccess
)
from app.security.audit_system import (
    AuditSystem, AuditLevel, AuditEvent
)
from app.security.encryption_system import (
    EncryptionSystem, EncryptionLevel
)

class TestHIPAACompliance:
    """Test HIPAA Compliance System"""
    
    @pytest.fixture
    def hipaa_system(self):
        return HIPAACompliance()
    
    def test_phi_access_validation(self, hipaa_system):
        """Test PHI access validation"""
        # Test LIMITED access to SENSITIVE data (should allow)
        assert hipaa_system.validate_phi_access(
            user_id="test_user",
            phi_level=PHILevel.SENSITIVE,
            purpose="Test access"
        )
        
        # Test LIMITED access to CRITICAL data (should deny)
        assert not hipaa_system.validate_phi_access(
            user_id="test_user",
            phi_level=PHILevel.CRITICAL,
            purpose="Test access"
        )
    
    def test_phi_encryption(self, hipaa_system):
        """Test PHI data encryption"""
        test_data = {"patient_id": "12345", "condition": "test"}
        encrypted = hipaa_system.encrypt_phi(test_data)
        
        assert encrypted["encrypted"]
        assert "timestamp" in encrypted
    
    def test_access_audit(self, hipaa_system):
        """Test PHI access auditing"""
        # Generate some access records
        hipaa_system.validate_phi_access(
            user_id="test_user",
            phi_level=PHILevel.SENSITIVE,
            purpose="Test audit"
        )
        
        # Check audit records
        audit_records = hipaa_system.audit_access()
        assert len(audit_records) > 0
        assert isinstance(audit_records[0], PHIAccess)

class TestAuditSystem:
    """Test Comprehensive Audit System"""
    
    @pytest.fixture
    def audit_system(self):
        return AuditSystem()
    
    def test_event_logging(self, audit_system):
        """Test audit event logging"""
        event_id = audit_system.log_event(
            level=AuditLevel.CRITICAL,
            component="security_test",
            action="test_action",
            user_id="test_user",
            details={"test": "data"}
        )
        
        assert event_id != ""
        
        # Query the event
        events = audit_system.query_events(
            level=AuditLevel.CRITICAL,
            component="security_test"
        )
        
        assert len(events) > 0
        assert events[0].event_id == event_id
    
    def test_audit_chain_validation(self, audit_system):
        """Test audit chain integrity"""
        # Log multiple events
        audit_system.log_event(
            level=AuditLevel.CRITICAL,
            component="security_test",
            action="test_action1",
            user_id="test_user",
            details={"test": "data1"}
        )
        
        audit_system.log_event(
            level=AuditLevel.CRITICAL,
            component="security_test",
            action="test_action2",
            user_id="test_user",
            details={"test": "data2"}
        )
        
        # Validate chain
        assert audit_system.validate_audit_chain()
    
    def test_event_filtering(self, audit_system):
        """Test audit event filtering"""
        # Log events with different levels
        audit_system.log_event(
            level=AuditLevel.CRITICAL,
            component="security_test",
            action="critical_action",
            user_id="test_user",
            details={"priority": "high"}
        )
        
        audit_system.log_event(
            level=AuditLevel.ROUTINE,
            component="security_test",
            action="routine_action",
            user_id="test_user",
            details={"priority": "low"}
        )
        
        # Filter critical events
        critical_events = audit_system.query_events(
            level=AuditLevel.CRITICAL
        )
        
        assert len(critical_events) == 1
        assert critical_events[0].level == AuditLevel.CRITICAL

class TestEncryptionSystem:
    """Test Enhanced Encryption System"""
    
    @pytest.fixture
    def encryption_system(self):
        return EncryptionSystem()
    
    def test_critical_data_encryption(self, encryption_system):
        """Test critical data encryption"""
        test_data = {
            "phi": "sensitive_data",
            "timestamp": datetime.now().isoformat()
        }
        
        # Encrypt critical data
        encrypted = encryption_system.encrypt_data(
            data=test_data,
            level=EncryptionLevel.CRITICAL
        )
        
        assert "encrypted_data" in encrypted
        assert encrypted["level"] == EncryptionLevel.CRITICAL.value
        
        # Decrypt and verify
        decrypted = encryption_system.decrypt_data(
            encrypted_data=encrypted,
            level=EncryptionLevel.CRITICAL
        )
        
        assert decrypted["phi"] == test_data["phi"]
    
    def test_encryption_levels(self, encryption_system):
        """Test different encryption levels"""
        test_data = {"test": "data"}
        
        # Test all encryption levels
        for level in EncryptionLevel:
            encrypted = encryption_system.encrypt_data(
                data=test_data,
                level=level
            )
            
            decrypted = encryption_system.decrypt_data(
                encrypted_data=encrypted,
                level=level
            )
            
            assert decrypted == test_data
    
    def test_key_management(self, encryption_system):
        """Test encryption key management"""
        # Verify key initialization
        assert encryption_system.key is not None
        assert encryption_system.salt is not None
        
        # Test key derivation
        new_key = encryption_system._generate_key()
        assert new_key != encryption_system.key
