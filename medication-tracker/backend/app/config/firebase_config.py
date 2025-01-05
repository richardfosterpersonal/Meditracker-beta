"""
Firebase Configuration
Handles Firebase initialization and configuration
Last Updated: 2025-01-03T22:18:41+01:00
"""

import os
from pathlib import Path
from typing import Dict, Optional
import firebase_admin
from firebase_admin import credentials
from ..exceptions import ConfigurationError

class FirebaseConfig:
    """Firebase configuration manager"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseConfig, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not FirebaseConfig._initialized:
            self._initialize_firebase()
            FirebaseConfig._initialized = True
    
    def _initialize_firebase(self):
        """Initialize Firebase with credentials"""
        try:
            # Get credentials path from environment
            creds_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
            if not creds_path:
                raise ConfigurationError("FIREBASE_CREDENTIALS_PATH not set")
                
            # Check if credentials file exists
            if not Path(creds_path).exists():
                raise ConfigurationError(f"Firebase credentials not found at {creds_path}")
                
            # Initialize Firebase
            cred = credentials.Certificate(creds_path)
            self.app = firebase_admin.initialize_app(cred)
            
        except Exception as e:
            raise ConfigurationError(f"Failed to initialize Firebase: {str(e)}")
    
    def get_app(self):
        """Get Firebase app instance"""
        return self.app
