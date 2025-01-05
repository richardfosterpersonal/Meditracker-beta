"""
Secure Parameter Generation Script
Last Updated: 2024-12-25T19:34:00+01:00
Status: VALIDATED
Reference: MASTER_CRITICAL_PATH.md
"""

import base64
import os
import secrets
import string
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class SecureParameterGenerator:
    """Generates secure parameters following security best practices."""
    
    def __init__(self, output_dir: str):
        """Initialize the generator with output directory."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.validation_file = self.output_dir / "parameter_validation.log"

    def generate_random_bytes(self, length: int = 32) -> bytes:
        """Generate cryptographically secure random bytes."""
        return secrets.token_bytes(length)

    def generate_base64_key(self, length: int = 32) -> str:
        """Generate a base64-encoded random key."""
        return base64.b64encode(self.generate_random_bytes(length)).decode('utf-8')

    def generate_secure_password(self, length: int = 32) -> str:
        """Generate a secure password with mixed characters."""
        alphabet = string.ascii_letters + string.digits + string.punctuation
        while True:
            password = ''.join(secrets.choice(alphabet) for _ in range(length))
            if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in string.punctuation for c in password)):
                return password

    def generate_jwt_secrets(self) -> Dict[str, str]:
        """Generate JWT-related secrets."""
        return {
            'JWT_SECRET': self.generate_base64_key(32),
            'JWT_REFRESH_SECRET': self.generate_base64_key(32)
        }

    def generate_encryption_keys(self) -> Dict[str, str]:
        """Generate encryption-related keys."""
        return {
            'ENCRYPTION_KEY': self.generate_base64_key(32),
            'KEY_ENCRYPTION_KEY': self.generate_base64_key(32)
        }

    def generate_database_credentials(self) -> Dict[str, str]:
        """Generate database credentials."""
        return {
            'POSTGRES_PASSWORD': self.generate_secure_password(32),
            'POSTGRES_USER': f"medtrack_{secrets.token_hex(8)}"
        }

    def generate_all_parameters(self) -> Dict[str, str]:
        """Generate all secure parameters."""
        parameters = {}
        parameters.update(self.generate_jwt_secrets())
        parameters.update(self.generate_encryption_keys())
        parameters.update(self.generate_database_credentials())
        return parameters

    def validate_parameter(self, name: str, value: str) -> bool:
        """Validate a generated parameter."""
        if not value:
            return False
        
        if 'KEY' in name or 'SECRET' in name:
            return len(value) >= 32
        
        if 'PASSWORD' in name:
            return (len(value) >= 16 and
                   any(c.islower() for c in value) and
                   any(c.isupper() for c in value) and
                   any(c.isdigit() for c in value) and
                   any(c in string.punctuation for c in value))
        
        return True

    def log_validation(self, name: str, is_valid: bool):
        """Log parameter validation results."""
        timestamp = datetime.now().isoformat()
        result = "VALID" if is_valid else "INVALID"
        with open(self.validation_file, 'a') as f:
            f.write(f"{timestamp} - Parameter: {name} - Status: {result}\n")

    def generate_and_validate(self) -> Dict[str, str]:
        """Generate and validate all parameters."""
        parameters = self.generate_all_parameters()
        
        for name, value in parameters.items():
            is_valid = self.validate_parameter(name, value)
            self.log_validation(name, is_valid)
            if not is_valid:
                raise ValueError(f"Generated parameter {name} failed validation")
        
        return parameters

    def save_parameters(self, parameters: Dict[str, str], environment: str):
        """Save parameters to environment-specific files."""
        env_file = self.output_dir / f".env.{environment}"
        with open(env_file, 'w') as f:
            f.write(f"# Generated on {datetime.now().isoformat()}\n")
            f.write("# DO NOT COMMIT THIS FILE\n\n")
            for name, value in sorted(parameters.items()):
                f.write(f"{name}={value}\n")

def main():
    parser = argparse.ArgumentParser(description='Generate secure parameters')
    parser.add_argument('--output-dir', default='./secure_params',
                      help='Output directory for parameter files')
    parser.add_argument('--environment', default='development',
                      choices=['development', 'staging', 'production'],
                      help='Target environment')
    
    args = parser.parse_args()
    
    generator = SecureParameterGenerator(args.output_dir)
    try:
        parameters = generator.generate_and_validate()
        generator.save_parameters(parameters, args.environment)
        print(f"Successfully generated and validated parameters for {args.environment}")
        print(f"Parameters saved to {args.output_dir}/.env.{args.environment}")
        print(f"Validation log saved to {generator.validation_file}")
    except Exception as e:
        print(f"Error generating parameters: {e}")
        exit(1)

if __name__ == '__main__':
    main()
