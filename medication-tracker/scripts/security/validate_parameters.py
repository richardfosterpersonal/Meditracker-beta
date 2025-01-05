"""
Parameter Validation Script
Last Updated: 2024-12-25T19:34:00+01:00
Status: VALIDATED
Reference: MASTER_CRITICAL_PATH.md
"""

import os
import re
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class ParameterValidator:
    """Validates security parameters against defined requirements."""
    
    def __init__(self, log_dir: str):
        """Initialize the validator with logging directory."""
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging."""
        log_file = self.log_dir / f"parameter_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def validate_jwt_secret(self, value: str) -> bool:
        """Validate JWT secret."""
        if not value or len(value) < 32:
            self.logger.error("JWT secret must be at least 32 characters")
            return False
        return True

    def validate_encryption_key(self, value: str) -> bool:
        """Validate encryption key."""
        try:
            # Check if it's a valid base64 string
            import base64
            decoded = base64.b64decode(value)
            if len(decoded) < 32:
                self.logger.error("Encryption key must be at least 32 bytes after base64 decoding")
                return False
            return True
        except Exception:
            self.logger.error("Encryption key must be a valid base64-encoded string")
            return False

    def validate_password(self, value: str) -> bool:
        """Validate password strength."""
        if not value or len(value) < 16:
            self.logger.error("Password must be at least 16 characters")
            return False
        
        checks = [
            (lambda s: any(c.isupper() for c in s), "uppercase letter"),
            (lambda s: any(c.islower() for c in s), "lowercase letter"),
            (lambda s: any(c.isdigit() for c in s), "number"),
            (lambda s: any(not c.isalnum() for c in s), "special character")
        ]
        
        for check, requirement in checks:
            if not check(value):
                self.logger.error(f"Password must contain at least one {requirement}")
                return False
        
        return True

    def validate_database_url(self, value: str) -> bool:
        """Validate database URL format."""
        pattern = r'^postgresql://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        if not re.match(pattern, value):
            self.logger.error("Invalid database URL format")
            return False
        return True

    def validate_parameter(self, name: str, value: str) -> bool:
        """Validate a parameter based on its name."""
        validators = {
            'JWT_SECRET': self.validate_jwt_secret,
            'JWT_REFRESH_SECRET': self.validate_jwt_secret,
            'ENCRYPTION_KEY': self.validate_encryption_key,
            'KEY_ENCRYPTION_KEY': self.validate_encryption_key,
            'POSTGRES_PASSWORD': self.validate_password,
            'DATABASE_URL': self.validate_database_url
        }
        
        validator = validators.get(name)
        if validator:
            return validator(value)
        
        # Default validation for unknown parameters
        return bool(value)

    def validate_environment_file(self, env_file: Path) -> bool:
        """Validate all parameters in an environment file."""
        if not env_file.exists():
            self.logger.error(f"Environment file not found: {env_file}")
            return False
        
        self.logger.info(f"Validating environment file: {env_file}")
        all_valid = True
        
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                try:
                    name, value = line.split('=', 1)
                    name = name.strip()
                    value = value.strip()
                    
                    is_valid = self.validate_parameter(name, value)
                    if is_valid:
                        self.logger.info(f"Parameter {name}: VALID")
                    else:
                        self.logger.error(f"Parameter {name}: INVALID")
                        all_valid = False
                except ValueError:
                    self.logger.error(f"Invalid line format: {line}")
                    all_valid = False
        
        return all_valid

    def generate_validation_report(self, env_file: Path) -> str:
        """Generate a validation report."""
        report_file = self.log_dir / f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_file, 'w') as f:
            f.write(f"# Parameter Validation Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            f.write(f"Environment File: {env_file}\n\n")
            
            f.write("## Validation Results\n\n")
            with open(env_file) as env:
                for line in env:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    try:
                        name, value = line.split('=', 1)
                        name = name.strip()
                        is_valid = self.validate_parameter(name, '*' * 8)  # Don't write actual values
                        status = "✓ VALID" if is_valid else "✗ INVALID"
                        f.write(f"- {name}: {status}\n")
                    except ValueError:
                        f.write(f"- Invalid line format: {line}\n")
            
            f.write("\n## Recommendations\n\n")
            f.write("1. Regularly rotate sensitive parameters\n")
            f.write("2. Use secure storage for production values\n")
            f.write("3. Maintain separate configurations per environment\n")
        
        return str(report_file)

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Validate security parameters')
    parser.add_argument('--env-file', required=True,
                      help='Path to environment file')
    parser.add_argument('--log-dir', default='./validation_logs',
                      help='Directory for validation logs')
    
    args = parser.parse_args()
    
    validator = ParameterValidator(args.log_dir)
    env_file = Path(args.env_file)
    
    if validator.validate_environment_file(env_file):
        report_file = validator.generate_validation_report(env_file)
        print(f"Validation successful. Report saved to: {report_file}")
        exit(0)
    else:
        print("Validation failed. Check logs for details.")
        exit(1)

if __name__ == '__main__':
    main()
