"""
Beta Testing Configuration
Critical Path: BETA-CONFIG
Last Updated: 2025-01-02T20:12:18+01:00

Central configuration for beta testing features and monitoring.
"""

from dataclasses import dataclass
from typing import Dict, Any, Set
from datetime import datetime, timezone

@dataclass
class BetaConfig:
    """Beta testing configuration"""
    
    # Feature flags for beta testing
    FEATURES = {
        "medication_tracking": True,
        "notification_system": True,
        "interaction_checking": True,
        "emergency_contacts": True,
        "advanced_scheduling": True
    }
    
    # Monitoring configuration
    MONITORING = {
        "enabled": True,
        "log_level": "DEBUG",
        "metrics_interval": 60,  # seconds
        "alert_thresholds": {
            "error_rate": 0.05,      # 5% error threshold
            "response_time": 2000,    # ms
            "memory_usage": 512,      # MB
            "cpu_usage": 80          # percent
        }
    }
    
    # Rate limits for beta testing
    RATE_LIMITS = {
        "default": 120,          # requests per minute
        "auth": 20,             # auth attempts per minute
        "medication_add": 30,    # medications per minute
        "notification": 60       # notifications per minute
    }
    
    # Beta testing specific validation rules
    VALIDATION = {
        "strict_mode": True,
        "log_all_requests": True,
        "validate_responses": True,
        "track_performance": True
    }
    
    # Error tracking configuration
    ERROR_TRACKING = {
        "enabled": True,
        "include_stack_trace": True,
        "notify_threshold": 5,   # errors per minute
        "sample_rate": 1.0      # track all errors
    }
    
    # Beta tester specific features
    BETA_FEATURES = {
        "feedback_form": True,
        "debug_logging": True,
        "performance_metrics": True,
        "error_reporting": True
    }
    
    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Get current beta testing status"""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "features_enabled": cls.FEATURES,
            "monitoring_active": cls.MONITORING["enabled"],
            "validation_mode": "strict" if cls.VALIDATION["strict_mode"] else "normal",
            "error_tracking": cls.ERROR_TRACKING["enabled"]
        }
        
    @classmethod
    def is_feature_enabled(cls, feature: str) -> bool:
        """Check if a feature is enabled for beta testing"""
        return cls.FEATURES.get(feature, False)
        
    @classmethod
    def get_rate_limit(cls, endpoint: str) -> int:
        """Get rate limit for an endpoint"""
        return cls.RATE_LIMITS.get(endpoint, cls.RATE_LIMITS["default"])
        
    @classmethod
    def should_track_error(cls) -> bool:
        """Determine if an error should be tracked"""
        return (
            cls.ERROR_TRACKING["enabled"] and
            cls.ERROR_TRACKING["sample_rate"] >= 1.0
        )
