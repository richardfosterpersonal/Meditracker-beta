"""
Pre-validation system tests
Last Updated: 2025-01-01T21:41:25+01:00
"""

import asyncio
import pytest
import os
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.pre_validation_hooks import (
    PreValidationHookManager,
    SystemDependencyCorrection,
    FileSystemCorrection,
    PreValidationRequirement
)
from app.exceptions import PreValidationError

@pytest.fixture
async def hook_manager():
    manager = PreValidationHookManager()
    yield manager

@pytest.fixture
def temp_test_dir(tmp_path):
    test_dir = tmp_path / "test_validation"
    test_dir.mkdir()
    yield test_dir
    shutil.rmtree(test_dir)

@pytest.mark.asyncio
async def test_system_dependency_correction_pre_validation():
    """Test system dependency correction pre-validation"""
    correction = SystemDependencyCorrection(PreValidationRequirement.SYSTEM_DEPENDENCIES_READY)
    
    # Test with safe package
    error = ImportError("No module named 'yaml'")
    assert await correction.pre_validate_correction(error)
    
    # Test with unsafe package
    error = ImportError("No module named 'malicious_package'")
    assert not await correction.pre_validate_correction(error)

@pytest.mark.asyncio
async def test_filesystem_correction_pre_validation(temp_test_dir):
    """Test filesystem correction pre-validation"""
    correction = FileSystemCorrection(PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY)
    
    # Test with valid YAML path
    test_file = temp_test_dir / "architecture.yaml"
    error = FileNotFoundError(f"[Errno 2] No such file or directory: '{test_file}'")
    assert await correction.pre_validate_correction(error)
    
    # Test with insufficient permissions
    with patch('os.access', return_value=False):
        assert not await correction.pre_validate_correction(error)
    
    # Test with insufficient disk space
    with patch('shutil.disk_usage', return_value=MagicMock(free=1024)):  # Only 1KB free
        assert not await correction.pre_validate_correction(error)

@pytest.mark.asyncio
async def test_correction_rollback():
    """Test correction rollback functionality"""
    correction = SystemDependencyCorrection(PreValidationRequirement.SYSTEM_DEPENDENCIES_READY)
    
    # Mock package installation
    with patch('asyncio.create_subprocess_exec', new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = MagicMock(
            communicate=AsyncMock(return_value=(b'', b'')),
            returncode=0
        )
        
        error = ImportError("No module named 'yaml'")
        
        # Mock successful pre-validation
        with patch.object(correction, 'pre_validate_correction', return_value=True):
            # Mock failed verification to trigger rollback
            with patch.object(correction, 'verify_correction', return_value=False):
                assert not await correction.correct(error)
                
                # Verify rollback was attempted
                calls = mock_exec.call_args_list
                assert any('uninstall' in str(call) for call in calls)

@pytest.mark.asyncio
async def test_validation_chain(hook_manager):
    """Test the entire validation chain"""
    
    # Mock successful system validation
    with patch.object(hook_manager.hooks[PreValidationRequirement.SYSTEM_DEPENDENCIES_READY], '__call__', 
                     new_callable=AsyncMock, return_value=True):
        
        # Mock failed filesystem validation that needs correction
        def filesystem_side_effect():
            if not hasattr(filesystem_side_effect, 'called'):
                filesystem_side_effect.called = True
                raise FileNotFoundError("Missing architecture.yaml")
            return True
            
        filesystem_hook = hook_manager.hooks[PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY]
        filesystem_hook.__call__ = AsyncMock(side_effect=filesystem_side_effect)
        
        # Run validation chain
        results = await hook_manager.run_all_hooks()
        
        # Verify system validation passed
        assert results[PreValidationRequirement.SYSTEM_DEPENDENCIES_READY]
        
        # Verify filesystem validation was corrected
        assert results[PreValidationRequirement.FILESYSTEM_DEPENDENCIES_READY]
        
        # Verify correction was attempted
        assert filesystem_hook.__call__.call_count == 2  # Initial fail + retry after correction

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
