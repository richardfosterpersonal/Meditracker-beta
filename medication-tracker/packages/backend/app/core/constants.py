"""
Core Constants Module
Last Updated: 2024-12-25T23:13:38+01:00
Status: CRITICAL
Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
"""

# Interaction severity levels and actions
INTERACTION_LEVELS = {
    'SEVERE': {
        'action': 'block',
        'severity': 'high',
        'description': 'Potentially life-threatening interaction. Do not combine these medications.',
        'monitoring': 'Immediate medical attention required if combined.',
        'alternatives': 'Consider alternative medications.'
    },
    'MODERATE': {
        'action': 'warn',
        'severity': 'medium',
        'description': 'Significant interaction possible. Use with caution.',
        'monitoring': 'Monitor closely for side effects.',
        'alternatives': 'Consider spacing doses or alternative medications.'
    },
    'MILD': {
        'action': 'inform',
        'severity': 'low',
        'description': 'Minor interaction possible.',
        'monitoring': 'Monitor for changes in effectiveness.',
        'alternatives': 'Usually safe to combine, but monitor.'
    }
}

# Herb-drug interactions database
HERB_DRUG_INTERACTIONS = {
    'st_johns_wort': {
        'ssri': {
            'level': 'SEVERE',
            'description': 'Risk of serotonin syndrome',
            'mechanism': 'Increased serotonin levels'
        },
        'warfarin': {
            'level': 'SEVERE',
            'description': 'Reduced anticoagulant effect',
            'mechanism': 'Increased metabolism'
        }
    },
    'ginkgo': {
        'aspirin': {
            'level': 'MODERATE',
            'description': 'Increased bleeding risk',
            'mechanism': 'Antiplatelet effects'
        }
    }
}

# Safe dosage limits
SAFE_DOSAGE_LIMITS = {
    'mg': {'max_single': 1000, 'max_daily': 4000},
    'ml': {'max_single': 30, 'max_daily': 120},
    'g': {'max_single': 1, 'max_daily': 4},
}

# Security Settings
JWT_ALGORITHM = "HS256"
HASH_ALGORITHM = "bcrypt"
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour

# Beta Phase Constants
BETA_CRITICAL_PATHS = [
    'medication_safety',
    'security',
    'feature_flags',
    'beta_onboarding'
]  # Note: reliability is optional during beta

DEFAULT_BETA_FEATURES = {
    'family_sharing': {
        'enabled': False,
        'users': [],
        'rollout_percentage': 0
    },
    'emergency_contacts': {
        'enabled': False,
        'users': [],
        'rollout_percentage': 0
    },
    'medication_interaction': {
        'enabled': False,
        'users': [],
        'rollout_percentage': 0
    }
}

BETA_MAX_RETRIES = 5
BETA_RETRY_DELAY = 2  # seconds

BETA_REQUIRED_VALIDATIONS = {
    'medication_safety': [
        'drug_interaction',
        'dosage_verification',
        'emergency_protocol',
        'allergy_checks'
    ],
    'security': [
        'hipaa_compliance',
        'data_encryption',
        'access_control',
        'audit_logging'
    ],
    'core_reliability': [
        'data_persistence',
        'error_handling',
        'state_management',
        'basic_monitoring'
    ]
}

VALIDATION_STATUSES = {
    'VALID': 'All required validations passed',
    'PARTIAL': 'Some validations missing',
    'INVALID': 'Required validations failed',
    'MISSING_VALIDATION': 'No validation file found',
    'NOT_REQUIRED': 'Validation not required for this component'
}
