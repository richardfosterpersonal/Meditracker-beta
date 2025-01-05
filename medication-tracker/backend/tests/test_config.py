"""
Test-specific configuration
Last Updated: 2024-12-24T22:26:39+01:00

This module provides test-specific configuration and mocks.
Maintains critical path validation and single source of truth.
"""
from unittest.mock import MagicMock

# Mock cryptography modules
class MockFernet:
    def encrypt(self, data: bytes) -> bytes:
        return b"encrypted_" + data
    
    def decrypt(self, token: bytes) -> bytes:
        return token.replace(b"encrypted_", b"")

# Create mock modules
mock_fernet = MagicMock()
mock_fernet.Fernet = MockFernet

# Mock the entire cryptography module
import sys
sys.modules['cryptography'] = MagicMock()
sys.modules['cryptography.fernet'] = mock_fernet
sys.modules['cryptography.hazmat'] = MagicMock()
sys.modules['cryptography.hazmat.bindings'] = MagicMock()
sys.modules['cryptography.hazmat.bindings._rust'] = MagicMock()
