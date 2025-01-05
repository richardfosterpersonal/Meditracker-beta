"""
Validation Hook System Tests
Validates the validation hook system itself
Last Updated: 2024-12-24T22:25:18+01:00

This test suite validates the core validation hook system that enforces:
1. Critical path adherence
2. Single source of truth maintenance
3. Environment-specific requirements

References:
- /docs/validation/VALIDATION_HOOK.md
- /docs/validation/CRITICAL_PATH.md
- /docs/validation/SINGLE_SOURCE_VALIDATION.md
"""
import pytest
from datetime import datetime
from pathlib import Path
import shutil
import tempfile
from typing import Dict, Any

from app.core.validation_hook import (
    ValidationHook,
    ValidationHookType,
    ValidationHookResult
)
from app.core.validation_orchestrator import ValidationOrchestrator
from app.core.evidence_collector import (
    EvidenceCollector,
    EvidenceCategory,
    ValidationLevel
)

@pytest.fixture
async def setup_validation_environment():
    """Create a temporary validation environment"""
    # Create temp directory
    temp_dir = Path(tempfile.mkdtemp())
    docs_dir = temp_dir / "docs" / "validation"
    docs_dir.mkdir(parents=True)
    
    # Create required validation documents
    required_docs = [
        "CRITICAL_PATH.md",
        "SINGLE_SOURCE_VALIDATION.md",
        "CORE_VALIDATION_PROCESS.md",
        "VALIDATION_HOOK.md"
    ]
    
    for doc in required_docs:
        doc_path = docs_dir / doc
        doc_path.write_text(f"# Test {doc}\nLast Updated: {datetime.now().isoformat()}")
    
    # Initialize components
    orchestrator = ValidationOrchestrator()
    evidence_collector = EvidenceCollector()
    
    # Create validation hook
    hook = ValidationHook(
        validation_orchestrator=orchestrator,
        evidence_collector=evidence_collector,
        docs_path=str(docs_dir)
    )
    
    yield {
        "hook": hook,
        "temp_dir": temp_dir,
        "docs_dir": docs_dir,
        "orchestrator": orchestrator,
        "evidence_collector": evidence_collector
    }
    
    # Cleanup
    shutil.rmtree(temp_dir)

@pytest.mark.critical
class TestValidationHookSystem:
    """
    Test suite for the validation hook system
    Validation Level: HIGH
    Evidence Collection: REQUIRED
    """
    
    @pytest.mark.asyncio
    async def test_critical_path_validation(self, setup_validation_environment):
        """
        Verify critical path validation hook
        Validation Points:
        - Documentation existence
        - Component alignment
        - Evidence collection
        - Chain maintenance
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Test with valid component
        result = await hook.validate_critical_path("medication_tracking")
        assert result.passed is True
        assert result.hook_type == ValidationHookType.CRITICAL_PATH
        assert result.evidence_id != ""
        
        # Test with missing documentation
        (env["docs_dir"] / "CRITICAL_PATH.md").unlink()
        result = await hook.validate_critical_path("medication_tracking")
        assert result.passed is False
        assert "documentation missing" in result.details["message"]
        
        # Test with invalid component
        result = await hook.validate_critical_path("invalid_component")
        assert result.passed is False
        assert "not aligned" in result.details["message"]

    @pytest.mark.asyncio
    async def test_single_source_validation(self, setup_validation_environment):
        """
        Verify single source of truth validation hook
        Validation Points:
        - Required documents
        - Reference validation
        - Evidence collection
        - Documentation integrity
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Test with all documents present
        result = await hook.validate_single_source("medication_tracking")
        assert result.passed is True
        assert result.hook_type == ValidationHookType.SINGLE_SOURCE
        assert result.evidence_id != ""
        
        # Test with missing document
        (env["docs_dir"] / "SINGLE_SOURCE_VALIDATION.md").unlink()
        result = await hook.validate_single_source("medication_tracking")
        assert result.passed is False
        assert "Missing required documents" in result.details["message"]

    @pytest.mark.asyncio
    async def test_environment_validation(self, setup_validation_environment):
        """
        Verify environment-specific validation hook
        Validation Points:
        - HIPAA compliance
        - Security requirements
        - Evidence collection
        - Environment configuration
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Test with compliant component
        result = await hook.validate_environment("medication_tracking")
        assert result.passed is True
        assert result.hook_type == ValidationHookType.ENVIRONMENT
        assert result.evidence_id != ""
        
        # Mock non-compliant HIPAA status
        env["orchestrator"].validate_hipaa_compliance = lambda x: {
            "compliant": False,
            "details": "Missing encryption"
        }
        
        result = await hook.validate_environment("medication_tracking")
        assert result.passed is False
        assert "HIPAA compliance check failed" in result.details["message"]

    @pytest.mark.asyncio
    async def test_validation_chain_integrity(self, setup_validation_environment):
        """
        Verify validation chain maintains integrity
        Validation Points:
        - Chain consistency
        - Evidence linking
        - State maintenance
        - Timestamp validation
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Run all hooks
        results = await hook.run_all_hooks("medication_tracking")
        
        # Verify chain integrity
        evidence_chain = await env["evidence_collector"].get_evidence_chain(
            category=EvidenceCategory.VALIDATION
        )
        
        assert len(evidence_chain) >= 3  # One for each hook type
        assert all(e.validation_level == ValidationLevel.HIGH for e in evidence_chain)
        
        # Verify timestamps are sequential
        timestamps = [datetime.fromisoformat(e.timestamp) for e in evidence_chain]
        assert all(t1 <= t2 for t1, t2 in zip(timestamps, timestamps[1:]))

    @pytest.mark.asyncio
    async def test_concurrent_validation(self, setup_validation_environment):
        """
        Verify validation hooks handle concurrent operations
        Validation Points:
        - State consistency
        - Resource locking
        - Evidence ordering
        - Chain integrity
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Run multiple validations concurrently
        components = ["medication_tracking", "user_management", "monitoring"]
        results = await asyncio.gather(*[
            hook.run_all_hooks(component)
            for component in components
        ])
        
        # Verify all validations completed
        assert len(results) == len(components)
        assert all(
            all(r.passed for r in result.values())
            for result in results
        )
        
        # Verify evidence chain integrity
        evidence_chain = await env["evidence_collector"].get_evidence_chain(
            category=EvidenceCategory.VALIDATION
        )
        
        # Should have 3 validations per component
        assert len(evidence_chain) == len(components) * 3
        
        # Verify no evidence overwrites
        evidence_ids = [e.id for e in evidence_chain]
        assert len(evidence_ids) == len(set(evidence_ids))

    @pytest.mark.asyncio
    async def test_validation_error_handling(self, setup_validation_environment):
        """
        Verify validation hooks handle errors gracefully
        Validation Points:
        - Error capture
        - State recovery
        - Evidence preservation
        - Chain protection
        """
        env = setup_validation_environment
        hook = env["hook"]
        
        # Simulate validation errors
        env["orchestrator"].validate_component_alignment = lambda x: {
            "valid": False,
            "error": "Test error"
        }
        
        # Run validation
        result = await hook.validate_critical_path("medication_tracking")
        assert result.passed is False
        assert result.details["message"] != ""
        
        # Verify error evidence was collected
        evidence = await env["evidence_collector"].get_latest_evidence(
            category=EvidenceCategory.VALIDATION
        )
        assert evidence is not None
        assert "error" in str(evidence.data)
        
        # Verify chain remains valid
        chain = await env["evidence_collector"].get_evidence_chain(
            category=EvidenceCategory.VALIDATION
        )
        assert all(e.validation_level == ValidationLevel.HIGH for e in chain)
