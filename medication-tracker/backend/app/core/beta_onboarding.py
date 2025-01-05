"""
Beta User Onboarding System
Critical Path: Beta.Onboarding

Manages beta user onboarding process and feature access.
Cross-references:
- feature_flags.py: Feature management
- validation_hooks.py: Validation system
"""

import json
import logging
import secrets
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
from .feature_flags import FeatureFlags
from .validation_hooks import ValidationHooks

logger = logging.getLogger(__name__)

class BetaOnboarding:
    """Manages beta user onboarding process"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.users_file = project_root / 'beta' / 'users.json'
        self.feature_flags = FeatureFlags(project_root)
        self.users = self._load_users()
        
    def _load_users(self) -> Dict:
        """Load beta users from file"""
        if not self.users_file.exists():
            default_users = {
                'users': {},
                'last_updated': datetime.utcnow().isoformat()
            }
            self.users_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.users_file, 'w') as f:
                json.dump(default_users, f, indent=2)
            return default_users
            
        with open(self.users_file) as f:
            return json.load(f)
            
    def save_users(self) -> None:
        """Save current user state"""
        self.users['last_updated'] = datetime.utcnow().isoformat()
        with open(self.users_file, 'w') as f:
            json.dump(self.users, f, indent=2)
            
    @ValidationHooks.register('pre_validation')
    def onboard_user(self, email: str, name: str, features: Optional[List[str]] = None) -> Dict:
        """Onboard a new beta user"""
        user_id = secrets.token_urlsafe(16)
        
        # Create user record
        user = {
            'id': user_id,
            'email': email,
            'name': name,
            'onboarded_at': datetime.utcnow().isoformat(),
            'status': 'active',
            'features': features or []
        }
        
        # Enable requested features
        for feature in user['features']:
            self.feature_flags.enable_feature(feature, [user_id])
            
        # Save user
        self.users['users'][user_id] = user
        self.save_users()
        
        logger.info(f"Onboarded beta user: {email}")
        return user
        
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get beta user details"""
        return self.users['users'].get(user_id)
        
    def update_user_features(self, user_id: str, features: List[str]) -> bool:
        """Update user's feature access"""
        user = self.get_user(user_id)
        if not user:
            return False
            
        # Remove user from old features
        for feature in user['features']:
            if feature not in features:
                self.feature_flags.disable_feature(feature)
                
        # Add user to new features
        for feature in features:
            if feature not in user['features']:
                self.feature_flags.enable_feature(feature, [user_id])
                
        user['features'] = features
        self.save_users()
        return True
        
    def deactivate_user(self, user_id: str) -> bool:
        """Deactivate a beta user"""
        user = self.get_user(user_id)
        if not user:
            return False
            
        # Remove from all features
        for feature in user['features']:
            self.feature_flags.disable_feature(feature)
            
        user['status'] = 'inactive'
        user['deactivated_at'] = datetime.utcnow().isoformat()
        self.save_users()
        return True
        
    def get_active_users(self) -> List[Dict]:
        """Get all active beta users"""
        return [
            user for user in self.users['users'].values()
            if user['status'] == 'active'
        ]
        
    def get_user_features(self, user_id: str) -> List[str]:
        """Get features enabled for a user"""
        return self.feature_flags.get_enabled_features(user_id)
