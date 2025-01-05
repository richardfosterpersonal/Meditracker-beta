"""
Parameter Rotation Script
Last Updated: 2024-12-25T19:34:00+01:00
Status: VALIDATED
Reference: MASTER_CRITICAL_PATH.md
"""

import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import logging
import sys

# Import our parameter generation and validation modules
from generate_secure_parameters import SecureParameterGenerator
from validate_parameters import ParameterValidator

class ParameterRotationManager:
    """Manages secure parameter rotation."""
    
    def __init__(self, base_dir: str):
        """Initialize the rotation manager."""
        self.base_dir = Path(base_dir)
        self.config_dir = self.base_dir / 'config'
        self.backup_dir = self.base_dir / 'backups'
        self.log_dir = self.base_dir / 'logs'
        
        # Create required directories
        for directory in [self.config_dir, self.backup_dir, self.log_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        self._setup_logging()
        self.generator = SecureParameterGenerator(str(self.config_dir))
        self.validator = ParameterValidator(str(self.log_dir))

    def _setup_logging(self):
        """Configure logging."""
        log_file = self.log_dir / f"rotation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def backup_current_parameters(self, env_file: Path):
        """Create a backup of current parameters."""
        if not env_file.exists():
            self.logger.warning(f"No existing parameters file found at {env_file}")
            return
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f"{env_file.stem}_{timestamp}{env_file.suffix}"
        
        shutil.copy2(env_file, backup_file)
        self.logger.info(f"Created backup: {backup_file}")
        
        # Keep only last 5 backups
        backups = sorted(self.backup_dir.glob(f"{env_file.stem}_*{env_file.suffix}"))
        for old_backup in backups[:-5]:
            old_backup.unlink()
            self.logger.info(f"Removed old backup: {old_backup}")

    def load_current_parameters(self, env_file: Path) -> Dict[str, str]:
        """Load current parameters from file."""
        parameters = {}
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    try:
                        name, value = line.split('=', 1)
                        parameters[name.strip()] = value.strip()
                    except ValueError:
                        continue
        return parameters

    def should_rotate_parameter(self, name: str, last_rotation: Optional[datetime]) -> bool:
        """Determine if a parameter should be rotated."""
        if not last_rotation:
            return True
        
        rotation_intervals = {
            'JWT_SECRET': timedelta(days=90),
            'JWT_REFRESH_SECRET': timedelta(days=90),
            'ENCRYPTION_KEY': timedelta(days=90),
            'KEY_ENCRYPTION_KEY': timedelta(days=180),
            'POSTGRES_PASSWORD': timedelta(days=90)
        }
        
        interval = rotation_intervals.get(name, timedelta(days=180))
        return datetime.now() - last_rotation >= interval

    def rotate_parameters(self, environment: str):
        """Rotate parameters that need rotation."""
        env_file = self.config_dir / f".env.{environment}"
        rotation_record_file = self.config_dir / f"rotation_record_{environment}.json"
        
        # Load rotation records
        rotation_records = {}
        if rotation_record_file.exists():
            with open(rotation_record_file) as f:
                records = json.load(f)
                rotation_records = {k: datetime.fromisoformat(v) 
                                 for k, v in records.items()}
        
        # Backup current parameters
        self.backup_current_parameters(env_file)
        
        # Load current parameters
        current_parameters = self.load_current_parameters(env_file)
        
        # Generate new parameters where needed
        new_parameters = {}
        parameters_rotated = False
        
        for name, value in current_parameters.items():
            last_rotation = rotation_records.get(name)
            if self.should_rotate_parameter(name, last_rotation):
                self.logger.info(f"Rotating parameter: {name}")
                if 'JWT' in name:
                    new_parameters[name] = self.generator.generate_base64_key()
                elif 'ENCRYPTION' in name:
                    new_parameters[name] = self.generator.generate_base64_key()
                elif 'PASSWORD' in name:
                    new_parameters[name] = self.generator.generate_secure_password()
                else:
                    new_parameters[name] = value
                rotation_records[name] = datetime.now()
                parameters_rotated = True
            else:
                new_parameters[name] = value
        
        if not parameters_rotated:
            self.logger.info("No parameters need rotation at this time")
            return
        
        # Validate new parameters
        for name, value in new_parameters.items():
            if not self.validator.validate_parameter(name, value):
                raise ValueError(f"Generated parameter {name} failed validation")
        
        # Save new parameters
        with open(env_file, 'w') as f:
            f.write(f"# Generated on {datetime.now().isoformat()}\n")
            f.write("# DO NOT COMMIT THIS FILE\n\n")
            for name, value in sorted(new_parameters.items()):
                f.write(f"{name}={value}\n")
        
        # Update rotation records
        with open(rotation_record_file, 'w') as f:
            json.dump({k: v.isoformat() for k, v in rotation_records.items()}, f, indent=2)
        
        self.logger.info("Parameter rotation completed successfully")

    def generate_rotation_report(self, environment: str) -> str:
        """Generate a report of the rotation status."""
        report_file = self.log_dir / f"rotation_report_{environment}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        rotation_record_file = self.config_dir / f"rotation_record_{environment}.json"
        
        with open(report_file, 'w') as f:
            f.write(f"# Parameter Rotation Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n")
            f.write(f"Environment: {environment}\n\n")
            
            if rotation_record_file.exists():
                with open(rotation_record_file) as record_f:
                    records = json.load(record_f)
                    f.write("## Rotation History\n\n")
                    for name, timestamp in sorted(records.items()):
                        last_rotation = datetime.fromisoformat(timestamp)
                        days_since = (datetime.now() - last_rotation).days
                        next_rotation = self.should_rotate_parameter(name, last_rotation)
                        status = "NEEDS ROTATION" if next_rotation else "OK"
                        f.write(f"- {name}:\n")
                        f.write(f"  - Last Rotation: {timestamp}\n")
                        f.write(f"  - Days Since: {days_since}\n")
                        f.write(f"  - Status: {status}\n\n")
            else:
                f.write("No rotation history found.\n")
        
        return str(report_file)

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Rotate security parameters')
    parser.add_argument('--base-dir', default='./security',
                      help='Base directory for security files')
    parser.add_argument('--environment', required=True,
                      choices=['development', 'staging', 'production'],
                      help='Target environment')
    
    args = parser.parse_args()
    
    manager = ParameterRotationManager(args.base_dir)
    try:
        manager.rotate_parameters(args.environment)
        report_file = manager.generate_rotation_report(args.environment)
        print(f"Rotation completed successfully. Report saved to: {report_file}")
    except Exception as e:
        print(f"Error during rotation: {e}")
        exit(1)

if __name__ == '__main__':
    main()
