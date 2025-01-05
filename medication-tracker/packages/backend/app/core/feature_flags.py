"""
Feature Flag System for Beta Testing
Critical Path: Beta.Features

Manages feature flags for beta testing, allowing gradual feature rollout.
Cross-references:
- validation_hooks.py: Validation system
- beta_test_setup.py: Beta environment setup
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class FeatureFlags:
    """Manages feature flags for beta testing"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.config_file = project_root / 'config' / 'feature_flags.json'
        self.flags = self._load_flags()
        
    def _load_flags(self) -> Dict:
        """Load feature flags from config"""
        if not self.config_file.exists():
            default_flags = {
                'beta_features': {
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
                },
                'last_updated': datetime.utcnow().isoformat()
            }
            self.config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(default_flags, f, indent=2)
            return default_flags
            
        with open(self.config_file) as f:
            return json.load(f)
            
    def save_flags(self) -> None:
        """Save current flag state"""
        self.flags['last_updated'] = datetime.utcnow().isoformat()
        with open(self.config_file, 'w') as f:
            json.dump(self.flags, f, indent=2)
            
    def enable_feature(self, feature_name: str, user_ids: Optional[List[str]] = None,
                      rollout_percentage: Optional[int] = None) -> bool:
        """Enable a feature for specific users or percentage"""
        if feature_name not in self.flags['beta_features']:
            logger.error(f"Feature {feature_name} not found")
            return False
            
        feature = self.flags['beta_features'][feature_name]
        feature['enabled'] = True
        
        if user_ids:
            feature['users'].extend(user_id for user_id in user_ids 
                                  if user_id not in feature['users'])
            
        if rollout_percentage is not None:
            feature['rollout_percentage'] = min(100, max(0, rollout_percentage))
            
        self.save_flags()
        return True
        
    def disable_feature(self, feature_name: str) -> bool:
        """Disable a feature"""
        if feature_name not in self.flags['beta_features']:
            logger.error(f"Feature {feature_name} not found")
            return False
            
        feature = self.flags['beta_features'][feature_name]
        feature['enabled'] = False
        feature['users'] = []
        feature['rollout_percentage'] = 0
        
        self.save_flags()
        return True
        
    def is_feature_enabled(self, feature_name: str, user_id: Optional[str] = None) -> bool:
        """Check if feature is enabled for a user"""
        if feature_name not in self.flags['beta_features']:
            return False
            
        feature = self.flags['beta_features'][feature_name]
        if not feature['enabled']:
            return False
            
        if user_id:
            if user_id in feature['users']:
                return True
            if feature['rollout_percentage'] > 0:
                # Use user_id for consistent rollout
                user_number = sum(ord(c) for c in user_id)
                return (user_number % 100) < feature['rollout_percentage']
                
        return feature['rollout_percentage'] == 100
        
    def get_enabled_features(self, user_id: Optional[str] = None) -> List[str]:
        """Get list of enabled features for a user"""
        return [
            name for name in self.flags['beta_features']
            if self.is_feature_enabled(name, user_id)
        ]
        
    def reset_all_flags(self) -> None:
        """Reset all feature flags to default state"""
        self.flags['beta_features'] = {
            name: {
                'enabled': False,
                'users': [],
                'rollout_percentage': 0
            }
            for name in self.flags['beta_features']
        }
        self.save_flags()
