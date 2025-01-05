"""
Critical Path Validation Tests
Validates core requirements for beta testing readiness
Last Updated: 2024-12-24T22:20:21+01:00

This test suite implements the validation requirements specified in:
- /docs/validation/CRITICAL_PATH.md
- /docs/validation/SINGLE_SOURCE_VALIDATION.md
- /docs/validation/evidence/2024-12-24_critical_path_test_validation.md

Environment: Production/HIPAA Compliant
Security Level: HIGH
Validation Chain: STRICT
Evidence Collection: REQUIRED
"""
import pytest
from datetime import datetime, timedelta
from app.core.validation_orchestrator import (
    ValidationOrchestrator,
    CriticalPathComponent
)
from app.core.evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)
from app.services.monitoring_service import monitoring_service
from app.services.security_service import security_service
from app.services.audit_service import audit_service
from app.models.errors import ValidationError, SecurityError

@pytest.mark.critical
class TestCriticalPathValidation:
    """
    Comprehensive validation tests for critical path components
    Validation Requirements:
    - HIPAA Compliance: HIGH
    - Security Level: HIGH
    - Evidence Collection: REQUIRED
    - Monitoring: REQUIRED
    """
    
    @pytest.mark.asyncio
    async def test_evidence_chain_integrity(self, setup_validation):
        """
        Verify evidence chain maintains integrity through operations
        Validation Points:
        - Evidence integrity (HIGH)
        - Chain validation (HIGH)
        - Storage compliance (HIGH)
        - HIPAA compliance (REQUIRED)
        """
        evidence_collector = setup_validation["evidence_collector"]
        
        # Create test evidence
        await evidence_collector.collect_evidence(
            category=EvidenceCategory.VALIDATION,
            data={"action": "test_operation"},
            validation_level=ValidationLevel.HIGH
        )
        
        # Verify chain
        chain = await evidence_collector.get_evidence_chain(
            category=EvidenceCategory.VALIDATION
        )
        assert len(chain) > 0
        assert chain[-1].timestamp is not None
        assert chain[-1].validation_level == ValidationLevel.HIGH
        
        # Verify storage compliance
        storage_validation = await evidence_collector.validate_storage_compliance()
        assert storage_validation["status"] == "compliant"
        assert storage_validation["encryption_verified"] is True

    @pytest.mark.asyncio
    async def test_monitoring_alerts(self, setup_validation):
        """Verify monitoring system alerts and thresholds"""
        # Test alert creation
        alert = await monitoring_service.create_alert(
            type="medication_safety",
            severity="high",
            message="Test alert"
        )
        assert alert["status"] == "active"
        
        # Verify threshold compliance
        thresholds = await monitoring_service.validate_thresholds()
        assert thresholds["medication_safety"]["status"] == "compliant"
        
        # Test response time
        response_time = await monitoring_service.validate_response_time()
        assert response_time < 500  # milliseconds

    @pytest.mark.asyncio
    async def test_security_compliance(self, setup_validation):
        """Verify security measures and HIPAA compliance"""
        # Test encryption
        encryption_status = await security_service.validate_encryption()
        assert encryption_status["data_at_rest"] is True
        assert encryption_status["data_in_transit"] is True
        
        # Test HIPAA compliance
        hipaa_status = await security_service.validate_hipaa_compliance()
        assert hipaa_status["status"] == "compliant"
        assert len(hipaa_status["validations"]) > 0
        
        # Test audit logging
        audit_entry = await audit_service.create_audit_entry(
            action="security_check",
            status="completed"
        )
        assert audit_entry["logged"] is True
        
        # Verify audit trail
        audit_trail = await audit_service.get_audit_trail()
        assert len(audit_trail) > 0
        assert audit_trail[-1]["action"] == "security_check"

    @pytest.mark.asyncio
    async def test_user_session_management(self, setup_validation):
        """Verify user session management and authentication"""
        user_service = setup_validation["user_service"]
        
        # Test session creation
        session = await user_service.create_session(
            user_id="test_user",
            device_info={"type": "web", "browser": "test"}
        )
        assert session["status"] == "active"
        
        # Test session validation
        validation = await user_service.validate_session(session["id"])
        assert validation["valid"] is True
        assert validation["security_level"] == "high"
        
        # Test session termination
        termination = await user_service.terminate_session(session["id"])
        assert termination["status"] == "terminated"
        
        # Verify session audit trail
        audit = await user_service.get_session_audit(session["id"])
        assert len(audit) >= 3  # creation, validation, termination

    @pytest.mark.asyncio
    async def test_validation_orchestration(self, setup_validation):
        """Verify validation orchestration across components"""
        orchestrator = setup_validation["orchestrator"]
        
        # Test component validation
        validation = await orchestrator.validate_component(
            CriticalPathComponent.USER_MANAGEMENT
        )
        assert validation["status"] == "valid"
        assert validation["evidence_collected"] is True
        
        # Test cross-component validation
        cross_validation = await orchestrator.validate_component_interaction(
            CriticalPathComponent.USER_MANAGEMENT,
            CriticalPathComponent.MEDICATION_TRACKING
        )
        assert cross_validation["status"] == "valid"
        assert cross_validation["security_verified"] is True
        
        # Verify validation state
        state = await orchestrator.get_validation_state()
        assert state["global_status"] == "valid"
        assert len(state["validation_chain"]) > 0
