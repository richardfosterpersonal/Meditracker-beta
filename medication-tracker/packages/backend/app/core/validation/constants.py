"""
Validation Constants
Critical Path: VALIDATION-CONSTANTS
Last Updated: 2025-01-02T20:15:35+01:00

Single source of truth for validation rules and constants.
These are IMMUTABLE and should not be changed during runtime.
"""

from enum import Enum
from typing import Dict, Any, List, Set
from datetime import time

# Critical Paths - IMMUTABLE
class CriticalPath(str, Enum):
    MEDICATION = "MEDICATION"
    NOTIFICATION = "NOTIFICATION"
    AUTHENTICATION = "AUTHENTICATION"
    USER_DATA = "USER_DATA"
    SCHEDULING = "SCHEDULING"
    EMERGENCY = "EMERGENCY"
    INTERACTION = "INTERACTION"

# Validation Layers - IMMUTABLE
class ValidationLayer(str, Enum):
    SYSTEM = "SYSTEM"          # Core system validation
    SECURITY = "SECURITY"      # Security and authentication
    BUSINESS = "BUSINESS"      # Business rules
    DATA = "DATA"              # Data integrity
    INTERFACE = "INTERFACE"    # API/UI validation
    SAFETY = "SAFETY"          # Medical safety rules

# Static Validation Rules - IMMUTABLE
STATIC_VALIDATION_RULES = {
    # Medication validation - These rules are fixed for safety
    "medication": {
        "name": {
            "type": "string",
            "required": True,
            "max_length": 200,
            "pattern": r"^[A-Za-z0-9\-\s]+$"
        },
        "dosage": {
            "type": "string", 
            "required": True,
            "pattern": r"^\d+(\.\d+)?\s*(mg|ml|g|mcg|IU)$",
            "max_length": 50
        },
        "frequency": {
            "type": "object",
            "required": True,
            "properties": {
                "times_per_day": {"type": "integer", "min": 1, "max": 6},
                "interval_hours": {"type": "integer", "min": 4},
                "specific_times": {"type": "array", "max_items": 6},
                "with_food": {"type": "boolean"},
                "start_date": {"type": "date"},
                "end_date": {"type": "date", "optional": True}
            }
        },
        "type": {
            "type": "string",
            "required": True,
            "enum": ["prescription", "otc", "supplement"]
        },
        "interactions": {
            "check_required": True,
            "severity_levels": ["none", "minor", "moderate", "major", "critical"],
            "action_required": ["major", "critical"]
        }
    },
    
    # Security validation - These rules are non-negotiable
    "security": {
        "password": {
            "min_length": 12,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special": True,
            "max_age_days": 90,
            "history_size": 5  # Remember last 5 passwords
        },
        "rate_limits": {
            "default": 60,     # requests per minute
            "auth": 10,        # auth attempts per minute
            "beta": 120,       # increased limit for beta testing
            "emergency": 300   # emergency situations
        },
        "session": {
            "max_duration": 3600,  # 1 hour
            "extend_on_activity": True,
            "max_concurrent": 3
        }
    },
    
    # Data integrity - Core validation rules
    "data": {
        "max_batch_size": 100,
        "supported_formats": {"json", "xml"},
        "required_metadata": {
            "version",
            "timestamp",
            "source",
            "user_id",
            "device_info"
        },
        "encryption": {
            "required": True,
            "algorithm": "AES-256-GCM",
            "key_rotation_days": 30
        }
    },
    
    # Emergency protocols - Critical safety rules
    "emergency": {
        "contacts": {
            "min_required": 1,
            "max_allowed": 5,
            "required_fields": ["name", "phone", "relationship"],
            "verify_phone": True
        },
        "response_time": {
            "max_seconds": 30,
            "retry_count": 3,
            "escalation_required": True
        },
        "notifications": {
            "priority": "critical",
            "bypass_quiet_hours": True,
            "require_acknowledgment": True
        }
    }
}

# Dynamic Validation Configs - These can be adjusted but require restart
DYNAMIC_VALIDATION_CONFIGS = {
    # Beta testing configuration
    "beta": {
        "enabled": True,
        "log_level": "DEBUG",
        "extra_validation": True,
        "metrics_enabled": True,
        "feedback_required": True,
        "performance_monitoring": {
            "enabled": True,
            "sample_rate": 1.0,  # Monitor all requests
            "slow_threshold_ms": 500
        }
    },
    
    # Notification thresholds - Can be tuned based on user feedback
    "notifications": {
        "quiet_hours": {
            "start": time(22, 0),  # 10 PM
            "end": time(7, 0),     # 7 AM
            "timezone_aware": True
        },
        "batch_size": 10,
        "priority_thresholds": {
            "emergency": 999,  # No limit for emergencies
            "high": 5,        # max high priority notifications per hour
            "medium": 10,     # max medium priority notifications per hour
            "low": 20         # max low priority notifications per hour
        },
        "channels": {
            "push": True,
            "email": True,
            "sms": True
        }
    },
    
    # Feature flags - Can be adjusted for beta testing
    "features": {
        "advanced_scheduling": True,
        "medication_interaction_check": True,
        "emergency_contact_notification": True,
        "ai_suggestions": False,  # Not ready for beta
        "voice_commands": False,  # Not ready for beta
        "barcode_scanning": True
    },
    
    # Medication interaction checking
    "interactions": {
        "check_frequency": "realtime",
        "data_sources": ["fda", "ema", "who"],
        "cache_duration": 3600,  # 1 hour
        "severity_threshold": "moderate",
        "update_frequency": "daily"
    }
}

# Critical validation paths that must always succeed
CRITICAL_VALIDATIONS: Set[str] = {
    "medication.dosage",
    "medication.interactions",
    "security.authentication",
    "data.integrity",
    "emergency.contacts",
    "emergency.response",
    "security.encryption"
}

# Beta testing specific validations
BETA_VALIDATIONS = {
    "logging": {
        "enabled": True,
        "include_stack_trace": True,
        "log_request_body": True,
        "metrics_interval": 60,  # seconds
        "log_rotation": {
            "max_size": "100MB",
            "backup_count": 10
        }
    },
    "monitoring": {
        "enabled": True,
        "alert_thresholds": {
            "error_rate": 0.05,     # 5% error rate threshold
            "response_time": 2000,   # ms
            "memory_usage": 512,     # MB
            "cpu_usage": 80,         # percent
            "disk_usage": 85         # percent
        },
        "metrics_collection": {
            "enabled": True,
            "interval": 60,
            "retention_days": 30
        },
        "performance_tracking": {
            "enabled": True,
            "slow_query_threshold": 500,  # ms
            "track_db_connections": True,
            "track_cache_hits": True
        }
    },
    "testing": {
        "user_feedback": {
            "required": True,
            "min_length": 10,
            "categories": [
                "bug",
                "feature_request",
                "usability",
                "performance",
                "other"
            ]
        },
        "error_reporting": {
            "automatic": True,
            "include_context": True,
            "user_confirmation": False
        }
    }
}

# Validation error messages - Single source of truth
ERROR_MESSAGES = {
    "medication": {
        "invalid_dosage": "Invalid dosage format. Must be a number followed by unit (mg, ml, g, mcg, IU)",
        "invalid_frequency": "Invalid frequency. Must be between 1-6 times per day with minimum 4-hour interval",
        "interaction_detected": "Potential medication interaction detected: {details}",
        "schedule_conflict": "Schedule conflict detected: {details}",
        "invalid_name": "Invalid medication name. Use only letters, numbers, spaces, and hyphens",
        "future_date": "Start date cannot be in the future",
        "end_before_start": "End date must be after start date"
    },
    "security": {
        "invalid_password": "Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters",
        "password_expired": "Password has expired. Must be changed every {max_age} days",
        "rate_limit": "Rate limit exceeded. Please try again in {retry_after} seconds",
        "session_expired": "Session has expired. Please log in again",
        "concurrent_sessions": "Maximum number of concurrent sessions reached"
    },
    "data": {
        "invalid_format": "Invalid data format. Supported formats are: {formats}",
        "missing_metadata": "Missing required metadata: {fields}",
        "batch_size": "Batch size exceeds maximum of {max_size} items",
        "encryption_required": "Data must be encrypted before transmission"
    },
    "emergency": {
        "contact_required": "At least one emergency contact is required",
        "invalid_phone": "Invalid phone number for emergency contact",
        "response_timeout": "Emergency response timeout after {timeout} seconds",
        "acknowledgment_required": "Emergency notification requires acknowledgment"
    }
}
