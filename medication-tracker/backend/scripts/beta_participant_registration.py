#!/usr/bin/env python3
"""
Beta Participant Registration System
Manages beta tester onboarding and feature access
"""

import os
import sys
import uuid
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

import bcrypt
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BetaParticipantManager:
    """
    Manages beta participant registration, tracking, and feature access
    """
    def __init__(self, project_root: Path = None):
        """
        Initialize beta participant management system
        
        Args:
            project_root: Root directory of the project
        """
        self.project_root = project_root or Path(__file__).parent.parent.parent
        self.beta_dir = self.project_root / 'beta'
        self.beta_dir.mkdir(parents=True, exist_ok=True)
        
        # Beta participant database
        self.participants_file = self.beta_dir / 'participants.json'
        self.participants = self._load_participants()
        
    def _load_participants(self) -> dict:
        """
        Load existing beta participants
        
        Returns:
            Dictionary of beta participants
        """
        if not self.participants_file.exists():
            return {
                'participants': {},
                'total_registered': 0,
                'active_participants': 0
            }
        
        with open(self.participants_file, 'r') as f:
            return json.load(f)
    
    def _save_participants(self):
        """Save beta participant data"""
        with open(self.participants_file, 'w') as f:
            json.dump(self.participants, f, indent=2)
    
    def register_participant(
        self, 
        email: str, 
        name: str, 
        password: str,
        features: list = None
    ) -> dict:
        """
        Register a new beta participant
        
        Args:
            email: Participant's email
            name: Participant's name
            password: Account password
            features: Optional list of features to enable
        
        Returns:
            Participant registration details
        """
        # Validate email
        if not email or '@' not in email:
            raise ValueError("Invalid email address")
        
        # Check for existing participant
        if any(p['email'] == email for p in self.participants['participants'].values()):
            raise ValueError("Email already registered")
        
        # Generate unique participant ID
        participant_id = str(uuid.uuid4())
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        
        # Default features if not specified
        default_features = [
            'medication_tracking', 
            'emergency_contacts'
        ]
        features = features or default_features
        
        # Create participant record
        participant = {
            'id': participant_id,
            'email': email,
            'name': name,
            'hashed_password': hashed_password.decode(),
            'registered_at': datetime.now().isoformat(),
            'status': 'active',
            'features': features,
            'last_login': None
        }
        
        # Store participant
        self.participants['participants'][participant_id] = participant
        self.participants['total_registered'] += 1
        self.participants['active_participants'] += 1
        
        # Save to file
        self._save_participants()
        
        logger.info(f"Registered beta participant: {email}")
        
        return {k: v for k, v in participant.items() if k != 'hashed_password'}
    
    def authenticate_participant(self, email: str, password: str) -> dict:
        """
        Authenticate a beta participant
        
        Args:
            email: Participant's email
            password: Account password
        
        Returns:
            Authenticated participant details
        """
        # Find participant by email
        matching_participants = [
            p for p in self.participants['participants'].values() 
            if p['email'] == email
        ]
        
        if not matching_participants:
            raise ValueError("No participant found with this email")
        
        participant = matching_participants[0]
        
        # Verify password
        if not bcrypt.checkpw(
            password.encode(), 
            participant['hashed_password'].encode()
        ):
            raise ValueError("Invalid password")
        
        # Update last login
        participant['last_login'] = datetime.now().isoformat()
        self._save_participants()
        
        logger.info(f"Authenticated beta participant: {email}")
        
        return {k: v for k, v in participant.items() if k != 'hashed_password'}
    
    def get_participant_features(self, participant_id: str) -> list:
        """
        Retrieve features for a specific participant
        
        Args:
            participant_id: Unique participant identifier
        
        Returns:
            List of enabled features
        """
        participant = self.participants['participants'].get(participant_id)
        if not participant:
            raise ValueError("Participant not found")
        
        return participant['features']

def main():
    """
    Main entry point for beta participant registration
    """
    manager = BetaParticipantManager()
    
    # Example registration
    try:
        participant = manager.register_participant(
            email='beta_tester@medicationtracker.com',
            name='Beta Tester',
            password='SecureBeta2024!'
        )
        print("Beta Participant Registered:")
        print(json.dumps(participant, indent=2))
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
