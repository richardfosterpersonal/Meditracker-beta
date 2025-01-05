"""
Single Source Configuration
Defines the single source of truth for the entire application
"""
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from enum import Enum

class AppState:
    """Application state configuration"""
    
    # Current application phase
    CURRENT_PHASE = "beta"
    
    # Last updated timestamp
    LAST_UPDATED = "2024-12-24T16:33:50+01:00"
    
    # Critical path components
    CRITICAL_COMPONENTS = [
        "medication",
        "validation",
        "security",
        "infrastructure",
        "monitoring",
        "evidence"
    ]
    
    # Beta phase features
    BETA_FEATURES = {
        "medication": {
            "enabled": True,
            "validation_required": True,
            "evidence_required": True,
            "monitoring_required": True
        },
        "validation": {
            "enabled": True,
            "strict_mode": True,
            "evidence_required": True,
            "monitoring_required": True
        },
        "security": {
            "enabled": True,
            "hipaa_required": True,
            "evidence_required": True,
            "monitoring_required": True
        },
        "infrastructure": {
            "enabled": True,
            "scaling_enabled": True,
            "evidence_required": True,
            "monitoring_required": True
        },
        "monitoring": {
            "enabled": True,
            "real_time": True,
            "evidence_required": True,
            "alerts_enabled": True
        },
        "evidence": {
            "enabled": True,
            "structured_storage": True,
            "real_time_collection": True,
            "monitoring_required": True
        }
    }
    
    # Validation requirements
    VALIDATION_REQUIREMENTS = {
        "medication": {
            "safety_check": True,
            "interaction_check": True,
            "evidence_collection": True,
            "monitoring": True
        },
        "validation": {
            "critical_path_check": True,
            "single_source_check": True,
            "evidence_collection": True,
            "monitoring": True
        },
        "security": {
            "hipaa_check": True,
            "phi_protection": True,
            "evidence_collection": True,
            "monitoring": True
        },
        "infrastructure": {
            "system_check": True,
            "performance_check": True,
            "evidence_collection": True,
            "monitoring": True
        },
        "monitoring": {
            "real_time_check": True,
            "alert_system": True,
            "evidence_collection": True,
            "system_health": True
        },
        "evidence": {
            "storage_check": True,
            "collection_check": True,
            "monitoring": True,
            "validation": True
        }
    }
    
    # Evidence requirements
    EVIDENCE_REQUIREMENTS = {
        "medication": {
            "validation_evidence": True,
            "safety_evidence": True,
            "interaction_evidence": True,
            "monitoring_evidence": True
        },
        "validation": {
            "critical_path_evidence": True,
            "single_source_evidence": True,
            "system_evidence": True,
            "monitoring_evidence": True
        },
        "security": {
            "hipaa_evidence": True,
            "phi_evidence": True,
            "audit_evidence": True,
            "monitoring_evidence": True
        },
        "infrastructure": {
            "system_evidence": True,
            "performance_evidence": True,
            "scaling_evidence": True,
            "monitoring_evidence": True
        },
        "monitoring": {
            "real_time_evidence": True,
            "alert_evidence": True,
            "system_evidence": True,
            "health_evidence": True
        },
        "evidence": {
            "storage_evidence": True,
            "collection_evidence": True,
            "validation_evidence": True,
            "monitoring_evidence": True
        }
    }
    
    # Documentation requirements
    DOCUMENTATION_REQUIREMENTS = {
        "medication": {
            "validation_docs": True,
            "safety_docs": True,
            "interaction_docs": True,
            "monitoring_docs": True
        },
        "validation": {
            "critical_path_docs": True,
            "single_source_docs": True,
            "system_docs": True,
            "monitoring_docs": True
        },
        "security": {
            "hipaa_docs": True,
            "phi_docs": True,
            "audit_docs": True,
            "monitoring_docs": True
        },
        "infrastructure": {
            "system_docs": True,
            "performance_docs": True,
            "scaling_docs": True,
            "monitoring_docs": True
        },
        "monitoring": {
            "real_time_docs": True,
            "alert_docs": True,
            "system_docs": True,
            "health_docs": True
        },
        "evidence": {
            "storage_docs": True,
            "collection_docs": True,
            "validation_docs": True,
            "monitoring_docs": True
        }
    }
    
    # Monitoring requirements
    MONITORING_REQUIREMENTS = {
        "medication": {
            "safety_monitoring": True,
            "interaction_monitoring": True,
            "validation_monitoring": True,
            "evidence_monitoring": True
        },
        "validation": {
            "critical_path_monitoring": True,
            "single_source_monitoring": True,
            "system_monitoring": True,
            "evidence_monitoring": True
        },
        "security": {
            "hipaa_monitoring": True,
            "phi_monitoring": True,
            "audit_monitoring": True,
            "system_monitoring": True
        },
        "infrastructure": {
            "system_monitoring": True,
            "performance_monitoring": True,
            "scaling_monitoring": True,
            "evidence_monitoring": True
        },
        "monitoring": {
            "real_time_monitoring": True,
            "alert_monitoring": True,
            "system_monitoring": True,
            "health_monitoring": True
        },
        "evidence": {
            "storage_monitoring": True,
            "collection_monitoring": True,
            "validation_monitoring": True,
            "system_monitoring": True
        }
    }
    
    # Critical path requirements
    CRITICAL_PATH_REQUIREMENTS = {
        "medication": {
            "safety_critical": True,
            "interaction_critical": True,
            "validation_critical": True,
            "evidence_critical": True
        },
        "validation": {
            "critical_path_critical": True,
            "single_source_critical": True,
            "system_critical": True,
            "evidence_critical": True
        },
        "security": {
            "hipaa_critical": True,
            "phi_critical": True,
            "audit_critical": True,
            "system_critical": True
        },
        "infrastructure": {
            "system_critical": True,
            "performance_critical": True,
            "scaling_critical": True,
            "evidence_critical": True
        },
        "monitoring": {
            "real_time_critical": True,
            "alert_critical": True,
            "system_critical": True,
            "health_critical": True
        },
        "evidence": {
            "storage_critical": True,
            "collection_critical": True,
            "validation_critical": True,
            "system_critical": True
        }
    }
    
    # Single source requirements
    SINGLE_SOURCE_REQUIREMENTS = {
        "medication": {
            "safety_source": True,
            "interaction_source": True,
            "validation_source": True,
            "evidence_source": True
        },
        "validation": {
            "critical_path_source": True,
            "single_source_source": True,
            "system_source": True,
            "evidence_source": True
        },
        "security": {
            "hipaa_source": True,
            "phi_source": True,
            "audit_source": True,
            "system_source": True
        },
        "infrastructure": {
            "system_source": True,
            "performance_source": True,
            "scaling_source": True,
            "evidence_source": True
        },
        "monitoring": {
            "real_time_source": True,
            "alert_source": True,
            "system_source": True,
            "health_source": True
        },
        "evidence": {
            "storage_source": True,
            "collection_source": True,
            "validation_source": True,
            "system_source": True
        }
    }
