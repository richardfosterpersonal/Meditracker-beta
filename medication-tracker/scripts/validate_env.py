#!/usr/bin/env python3
"""
Environment Configuration Validator
Validates that .env files contain all required validation settings
Complies with SINGLE_SOURCE_VALIDATION.md
"""

import os
import sys
from typing import Dict, List, Set
from pathlib import Path

REQUIRED_VALIDATION_VARS = {
    'development': {
        'VALIDATION_ENABLED',
        'VALIDATION_LOG_LEVEL',
        'VALIDATION_EVIDENCE_PATH',
        'MONITORING_ENABLED',
        'MONITORING_ENDPOINT',
        'SECURITY_SCAN_ENABLED'
    },
    'staging': {
        'VALIDATION_ENABLED',
        'VALIDATION_LOG_LEVEL',
        'VALIDATION_EVIDENCE_PATH',
        'MONITORING_ENABLED',
        'MONITORING_ENDPOINT',
        'MONITORING_INTERVAL',
        'SECURITY_SCAN_ENABLED',
        'SECURITY_SCAN_INTERVAL'
    },
    'beta': {
        'VALIDATION_ENABLED',
        'VALIDATION_LOG_LEVEL',
        'VALIDATION_EVIDENCE_PATH',
        'VALIDATION_CHECKPOINTS_ENABLED',
        'MONITORING_ENABLED',
        'MONITORING_ENDPOINT',
        'MONITORING_INTERVAL',
        'SECURITY_SCAN_ENABLED',
        'SECURITY_SCAN_INTERVAL',
        'SECURITY_EVIDENCE_PATH'
    }
}

def load_env_file(filepath: str) -> Dict[str, str]:
    """Load environment variables from file"""
    env_vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    except Exception as e:
        print(f"Error loading {filepath}: {str(e)}")
        sys.exit(1)
    return env_vars

def validate_env(env_type: str, env_vars: Dict[str, str]) -> List[str]:
    """Validate environment variables against requirements"""
    missing_vars = []
    required_vars = REQUIRED_VALIDATION_VARS.get(env_type, set())
    
    for var in required_vars:
        if var not in env_vars:
            missing_vars.append(var)
    
    return missing_vars

def main():
    project_root = Path("c:/Users/richa/CascadeProjects/medication-tracker")
    
    # Validate each environment
    environments = ['development', 'staging', 'beta']
    for env in environments:
        env_file = project_root / f'.env.{env}'
        if not env_file.exists():
            print(f"Warning: {env_file} does not exist")
            continue
            
        print(f"\nValidating {env} environment...")
        env_vars = load_env_file(str(env_file))
        missing = validate_env(env, env_vars)
        
        if missing:
            print(f"❌ Missing required validation variables in {env}:")
            for var in missing:
                print(f"  - {var}")
        else:
            print(f"✅ All required validation variables present in {env}")

if __name__ == "__main__":
    main()
