#!/usr/bin/env python3
"""
Secure Backup System for Medication Tracker
Designed for Beta Testing Data Protection

Core Responsibilities:
- Encrypted data backup
- Secure storage management
- Beta testing data anonymization
- Compliance-aware backup strategy
"""

import os
import sys
import json
import logging
import hashlib
import datetime
from typing import Dict, List, Optional
from pathlib import Path

import boto3
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='backup.log'
)
logger = logging.getLogger(__name__)

class SecureBackupManager:
    """
    Comprehensive secure backup system with beta testing considerations
    """
    
    def __init__(self, 
                 project_root: Optional[Path] = None, 
                 beta_mode: bool = False):
        """
        Initialize backup manager with flexible configuration
        
        Args:
            project_root: Root directory of the project
            beta_mode: Enable beta-specific backup strategies
        """
        self.project_root = project_root or Path(__file__).parent.parent.parent
        self.beta_mode = beta_mode
        
        # Encryption key management
        self.encryption_key = self._load_or_generate_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Backup configuration
        self.backup_config = self._load_backup_config()
        
    def _load_or_generate_key(self) -> bytes:
        """
        Load or generate an encryption key securely
        
        Returns:
            Encryption key for data protection
        """
        key_path = self.project_root / 'config' / 'backup_key.enc'
        key_path.parent.mkdir(parents=True, exist_ok=True)
        
        if key_path.exists():
            return key_path.read_bytes()
        
        key = Fernet.generate_key()
        key_path.write_bytes(key)
        return key
    
    def _load_backup_config(self) -> Dict:
        """
        Load backup configuration with beta testing adaptations
        
        Returns:
            Backup configuration dictionary
        """
        default_config = {
            'backup_locations': [
                str(self.project_root / 'backups'),
                os.getenv('CLOUD_BACKUP_BUCKET', '')
            ],
            'retention_days': 30 if not self.beta_mode else 14,
            'anonymize_data': self.beta_mode,
            'encryption_level': 'AES-256',
            'backup_frequency': 'hourly' if self.beta_mode else 'daily'
        }
        
        # Allow override from environment or config file
        config_path = self.project_root / 'config' / 'backup_config.json'
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except json.JSONDecodeError:
                logger.warning("Invalid backup configuration. Using defaults.")
        
        return default_config
    
    def anonymize_data(self, data: Dict) -> Dict:
        """
        Anonymize sensitive data for beta testing
        
        Args:
            data: Original data dictionary
        
        Returns:
            Anonymized data dictionary
        """
        if not self.beta_mode:
            return data
        
        anonymized = data.copy()
        
        # Example anonymization strategies
        if 'user_id' in anonymized:
            anonymized['user_id'] = hashlib.sha256(
                str(anonymized['user_id']).encode()
            ).hexdigest()[:12]
        
        # Remove direct personal identifiers
        sensitive_keys = ['email', 'phone', 'full_name']
        for key in sensitive_keys:
            anonymized.pop(key, None)
        
        return anonymized
    
    def backup(self, data: Dict) -> str:
        """
        Create a secure, potentially anonymized backup
        
        Args:
            data: Data to backup
        
        Returns:
            Backup file path
        """
        # Anonymize if in beta mode
        safe_data = self.anonymize_data(data)
        
        # Serialize and encrypt data
        serialized_data = json.dumps(safe_data).encode()
        encrypted_data = self.cipher_suite.encrypt(serialized_data)
        
        # Generate backup filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{timestamp}.enc"
        
        # Determine backup location
        backup_dir = Path(self.backup_config['backup_locations'][0])
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / backup_filename
        
        # Write encrypted backup
        backup_path.write_bytes(encrypted_data)
        
        logger.info(f"Backup created: {backup_path}")
        return str(backup_path)
    
    def cleanup_old_backups(self):
        """
        Remove backups older than retention period
        """
        retention_days = self.backup_config['retention_days']
        cutoff = datetime.datetime.now() - datetime.timedelta(days=retention_days)
        
        backup_dir = Path(self.backup_config['backup_locations'][0])
        for backup_file in backup_dir.glob("backup_*.enc"):
            file_timestamp = datetime.datetime.strptime(
                backup_file.stem, 
                "backup_%Y%m%d_%H%M%S"
            )
            if file_timestamp < cutoff:
                backup_file.unlink()
                logger.info(f"Removed old backup: {backup_file}")

def main():
    """
    Main backup execution point
    """
    try:
        # Example usage in beta mode
        backup_manager = SecureBackupManager(beta_mode=True)
        
        # Simulated data backup
        sample_data = {
            'user_id': 'user123',
            'email': 'test@example.com',
            'medication_data': {
                'prescriptions': ['med1', 'med2']
            }
        }
        
        backup_path = backup_manager.backup(sample_data)
        backup_manager.cleanup_old_backups()
        
        print(f"Backup completed: {backup_path}")
    
    except Exception as e:
        logger.error(f"Backup process failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
