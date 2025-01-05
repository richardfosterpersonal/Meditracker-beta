"""
Test Secure Mock Cryptography Implementation
Validates security controls and evidence collection
Last Updated: 2024-12-24T22:40:49+01:00
"""
import pytest
from datetime import datetime

from app.core.evidence_collector import EvidenceCategory, ValidationLevel
from tests.mock.mock_crypto import SecureMockCrypto

@pytest.mark.asyncio
async def test_key_generation(mock_crypto, mock_evidence_collector):
    """Test secure key generation with evidence collection"""
    # Generate key
    key = await mock_crypto.generate_key()
    
    # Validate key format
    assert key.startswith(b"secure_mock_key_")
    assert len(key) > 32
    
    # Validate evidence collection
    evidence = mock_evidence_collector.get_evidence()
    assert len(evidence) == 1
    assert evidence[0]["category"] == EvidenceCategory.SECURITY
    assert evidence[0]["validation_level"] == ValidationLevel.HIGH
    assert evidence[0]["data"]["operation"] == "key_generation"
    
@pytest.mark.asyncio
async def test_encryption(mock_crypto, mock_evidence_collector):
    """Test secure encryption with evidence collection"""
    # Generate key
    key = await mock_crypto.generate_key()
    
    # Encrypt data
    data = b"test_data"
    encrypted = await mock_crypto.encrypt(data, key)
    
    # Validate encryption
    assert encrypted.startswith(b"encrypted_")
    assert encrypted != data
    
    # Validate evidence collection
    evidence = mock_evidence_collector.get_evidence()
    assert len(evidence) == 2  # Key generation and encryption
    assert evidence[1]["category"] == EvidenceCategory.SECURITY
    assert evidence[1]["validation_level"] == ValidationLevel.HIGH
    assert evidence[1]["data"]["operation"] == "encryption"
    
@pytest.mark.asyncio
async def test_decryption(mock_crypto, mock_evidence_collector):
    """Test secure decryption with evidence collection"""
    # Generate key
    key = await mock_crypto.generate_key()
    
    # Encrypt and decrypt data
    data = b"test_data"
    encrypted = await mock_crypto.encrypt(data, key)
    decrypted = await mock_crypto.decrypt(encrypted, key)
    
    # Validate decryption
    assert decrypted == data
    
    # Validate evidence collection
    evidence = mock_evidence_collector.get_evidence()
    assert len(evidence) == 3  # Key generation, encryption, and decryption
    assert evidence[2]["category"] == EvidenceCategory.SECURITY
    assert evidence[2]["validation_level"] == ValidationLevel.HIGH
    assert evidence[2]["data"]["operation"] == "decryption"
    
@pytest.mark.asyncio
async def test_invalid_key(mock_crypto):
    """Test encryption with invalid key"""
    with pytest.raises(ValueError, match="Invalid key format"):
        await mock_crypto.encrypt(b"test_data", b"invalid_key")
        
@pytest.mark.asyncio
async def test_invalid_data(mock_crypto):
    """Test decryption with invalid data"""
    key = await mock_crypto.generate_key()
    with pytest.raises(ValueError, match="Invalid data format"):
        await mock_crypto.decrypt(b"invalid_data", key)
        
@pytest.mark.asyncio
async def test_audit_log(mock_crypto):
    """Test audit log maintenance"""
    # Perform operations
    key = await mock_crypto.generate_key()
    data = b"test_data"
    encrypted = await mock_crypto.encrypt(data, key)
    decrypted = await mock_crypto.decrypt(encrypted, key)
    
    # Validate audit log
    audit_log = mock_crypto.get_audit_log()
    assert len(audit_log) == 3  # Key generation, encryption, and decryption
    
    # Validate log entries
    for entry in audit_log:
        assert "timestamp" in entry
        assert "operation" in entry
        timestamp = datetime.fromisoformat(entry["timestamp"])
        assert isinstance(timestamp, datetime)
