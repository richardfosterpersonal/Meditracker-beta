"""
Configuration Tests
Critical Path: CONFIG-TESTS
Last Updated: 2025-01-02T16:08:17+01:00
"""

import pytest
from pathlib import Path

from app.core.config import config

def test_config_singleton():
    """Test configuration singleton pattern"""
    from app.core.config import get_config
    
    config1 = get_config()
    config2 = get_config()
    assert config1 is config2
    
def test_base_config():
    """Test base configuration properties"""
    assert isinstance(config.base_dir, Path)
    assert isinstance(config.version, str)
    assert isinstance(config.environment, str)
    
def test_path_config():
    """Test path configuration"""
    assert isinstance(config.get_path("data"), Path)
    assert isinstance(config.get_path("validation_evidence"), Path)
    assert isinstance(config.get_path("beta_evidence"), Path)
    assert isinstance(config.get_path("logs"), Path)
    
    with pytest.raises(KeyError):
        config.get_path("nonexistent")
        
def test_feature_config():
    """Test feature configuration"""
    assert config.get_bool("features.validation.enabled") is True
    assert config.get_str("features.validation.log_level") == "INFO"
    assert config.get_bool("features.beta.enabled") is True
    assert isinstance(config.get_str("features.beta.start_date"), str)
    assert isinstance(config.get_str("features.beta.end_date"), str)
    
    with pytest.raises(KeyError):
        config.get_bool("features.nonexistent")
        
def test_nested_config():
    """Test nested configuration access"""
    validation_config = config.get_dict("features.validation")
    assert isinstance(validation_config, dict)
    assert "enabled" in validation_config
    assert "log_level" in validation_config
    
    with pytest.raises(KeyError):
        config.get_dict("nonexistent.path")
        
def test_directory_creation():
    """Test directory creation"""
    assert config.get_path("data").exists()
    assert config.get_path("validation_evidence").exists()
    assert config.get_path("beta_evidence").exists()
    assert config.get_path("logs").exists()
