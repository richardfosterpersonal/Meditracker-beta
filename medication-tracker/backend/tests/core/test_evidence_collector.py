"""
Evidence Collector Tests
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:51:43+01:00
"""
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.evidence_collector import (
    EvidenceCollector,
    Evidence,
    EvidenceCategory,
    ValidationLevel
)

@pytest.fixture
def evidence_collector():
    return EvidenceCollector()

@pytest.fixture
def valid_medication_evidence() -> Dict[str, Any]:
    """Valid medication safety evidence data"""
    return {
        "category": EvidenceCategory.MEDICATION_SAFETY,
        "validation_level": ValidationLevel.CRITICAL,
        "data": {
            "action": "medication_check",
            "medication_id": "med_123",
            "safety_checks": ["interaction", "dosage", "timing"],
            "validation_chain": ["check_1", "check_2"]
        },
        "source": "test_module",
        "metadata": {
            "test_id": "test_123"
        }
    }

@pytest.fixture
def valid_security_evidence() -> Dict[str, Any]:
    """Valid data security evidence data"""
    return {
        "category": EvidenceCategory.DATA_SECURITY,
        "validation_level": ValidationLevel.HIGH,
        "data": {
            "action": "data_access",
            "user_id": "user_123",
            "access_type": "read",
            "hipaa_compliant": True
        },
        "source": "test_module",
        "metadata": {
            "test_id": "test_123"
        }
    }

@pytest.mark.asyncio
async def test_collect_evidence_success(
    evidence_collector,
    valid_medication_evidence
):
    """Test successful evidence collection"""
    evidence = await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"],
        metadata=valid_medication_evidence["metadata"]
    )
    
    assert evidence.id.startswith("ev_")
    assert evidence.category == valid_medication_evidence["category"]
    assert evidence.data == valid_medication_evidence["data"]
    assert evidence.hash != ""

@pytest.mark.asyncio
async def test_collect_evidence_medication_safety(
    evidence_collector,
    valid_medication_evidence
):
    """Test medication safety evidence validation"""
    evidence = await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    assert evidence.validate_critical_path()

@pytest.mark.asyncio
async def test_collect_evidence_data_security(
    evidence_collector,
    valid_security_evidence
):
    """Test data security evidence validation"""
    evidence = await evidence_collector.collect_evidence(
        category=valid_security_evidence["category"],
        validation_level=valid_security_evidence["validation_level"],
        data=valid_security_evidence["data"],
        source=valid_security_evidence["source"]
    )
    
    assert evidence.validate_critical_path()

@pytest.mark.asyncio
async def test_collect_evidence_invalid_medication(evidence_collector):
    """Test invalid medication safety evidence"""
    invalid_data = {
        "action": "medication_check",
        # Missing required fields
    }
    
    with pytest.raises(ValueError, match="critical path requirements"):
        await evidence_collector.collect_evidence(
            category=EvidenceCategory.MEDICATION_SAFETY,
            validation_level=ValidationLevel.CRITICAL,
            data=invalid_data,
            source="test_module"
        )

@pytest.mark.asyncio
async def test_get_evidence(
    evidence_collector,
    valid_medication_evidence
):
    """Test evidence retrieval"""
    evidence = await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    retrieved = await evidence_collector.get_evidence(evidence.id)
    assert retrieved is not None
    assert retrieved.id == evidence.id
    assert retrieved.hash == evidence.hash

@pytest.mark.asyncio
async def test_get_evidence_chain(
    evidence_collector,
    valid_medication_evidence,
    valid_security_evidence
):
    """Test evidence chain retrieval"""
    # Add multiple evidence items
    await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    await evidence_collector.collect_evidence(
        category=valid_security_evidence["category"],
        validation_level=valid_security_evidence["validation_level"],
        data=valid_security_evidence["data"],
        source=valid_security_evidence["source"]
    )
    
    # Get all evidence
    chain = await evidence_collector.get_evidence_chain()
    assert len(chain) == 2
    
    # Filter by category
    med_chain = await evidence_collector.get_evidence_chain(
        category=EvidenceCategory.MEDICATION_SAFETY
    )
    assert len(med_chain) == 1
    assert med_chain[0].category == EvidenceCategory.MEDICATION_SAFETY

@pytest.mark.asyncio
async def test_validate_evidence_chain(
    evidence_collector,
    valid_medication_evidence
):
    """Test evidence chain validation"""
    # Add valid evidence
    await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    # Validate chain
    is_valid = await evidence_collector.validate_evidence_chain()
    assert is_valid

@pytest.mark.asyncio
async def test_export_evidence(
    evidence_collector,
    valid_medication_evidence
):
    """Test evidence export"""
    # Add evidence
    await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    # Export as JSON
    exported = await evidence_collector.export_evidence(format="json")
    assert isinstance(exported, str)
    
    # Verify JSON structure
    import json
    data = json.loads(exported)
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["category"] == valid_medication_evidence["category"]

@pytest.mark.asyncio
async def test_get_validation_summary(
    evidence_collector,
    valid_medication_evidence,
    valid_security_evidence
):
    """Test validation summary generation"""
    # Add multiple evidence items
    await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    await evidence_collector.collect_evidence(
        category=valid_security_evidence["category"],
        validation_level=valid_security_evidence["validation_level"],
        data=valid_security_evidence["data"],
        source=valid_security_evidence["source"]
    )
    
    # Get summary
    summary = await evidence_collector.get_validation_summary()
    
    assert summary["total_evidence"] == 2
    assert summary["by_category"][EvidenceCategory.MEDICATION_SAFETY] == 1
    assert summary["by_category"][EvidenceCategory.DATA_SECURITY] == 1
    assert summary["validation_status"] is True
    assert "last_validated" in summary

@pytest.mark.asyncio
async def test_evidence_time_filtering(
    evidence_collector,
    valid_medication_evidence
):
    """Test evidence chain time-based filtering"""
    # Add evidence
    await evidence_collector.collect_evidence(
        category=valid_medication_evidence["category"],
        validation_level=valid_medication_evidence["validation_level"],
        data=valid_medication_evidence["data"],
        source=valid_medication_evidence["source"]
    )
    
    now = datetime.utcnow()
    start_time = now - timedelta(hours=1)
    end_time = now + timedelta(hours=1)
    
    # Test time range filtering
    chain = await evidence_collector.get_evidence_chain(
        start_time=start_time,
        end_time=end_time
    )
    assert len(chain) == 1
    
    # Test future start time
    chain = await evidence_collector.get_evidence_chain(
        start_time=now + timedelta(hours=2)
    )
    assert len(chain) == 0
