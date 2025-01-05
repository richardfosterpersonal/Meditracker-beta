"""
Pre-flight Validation Module
Critical Path: PreFlight.Validation

This module handles all pre-flight validation checks before the application starts.
It ensures all necessary conditions are met before attempting to start any services.
"""

import os
import sys
import logging
import socket
import pkg_resources
import subprocess
from typing import Dict, List, Tuple
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of a validation check"""
    success: bool
    message: str
    details: Dict[str, str] = None
    critical: bool = True

class PreflightValidator:
    """Handles pre-flight validation checks
    Critical Path: PreFlight.Core
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.results: List[ValidationResult] = []
        
    def validate_environment(self) -> ValidationResult:
        """Validate environment variables and their constraints
        Critical Path: PreFlight.Environment
        """
        try:
            # Required environment variables and their constraints
            env_requirements = {
                'JWT_SECRET_KEY': {
                    'min_length': 32,
                    'required': True,
                    'description': 'Authentication security key'
                },
                'DATABASE_URL': {
                    'required': True,
                    'description': 'Database connection string'
                },
                'JWT_ALGORITHM': {
                    'allowed_values': ['HS256', 'HS384', 'HS512'],
                    'required': True,
                    'description': 'JWT signing algorithm'
                },
                'ACCESS_TOKEN_EXPIRE_MINUTES': {
                    'type': int,
                    'min_value': 1,
                    'required': True,
                    'description': 'Token expiration time'
                }
            }
            
            issues = []
            for var, constraints in env_requirements.items():
                value = os.getenv(var)
                
                if constraints.get('required', False) and not value:
                    issues.append(f"{var} is required ({constraints['description']})")
                    continue
                    
                if value:
                    if 'min_length' in constraints and len(value) < constraints['min_length']:
                        issues.append(f"{var} must be at least {constraints['min_length']} characters")
                        
                    if 'allowed_values' in constraints and value not in constraints['allowed_values']:
                        issues.append(f"{var} must be one of: {', '.join(constraints['allowed_values'])}")
                        
                    if 'type' in constraints and constraints['type'] == int:
                        try:
                            int_val = int(value)
                            if 'min_value' in constraints and int_val < constraints['min_value']:
                                issues.append(f"{var} must be at least {constraints['min_value']}")
                        except ValueError:
                            issues.append(f"{var} must be a valid integer")
            
            if issues:
                return ValidationResult(
                    success=False,
                    message="Environment validation failed",
                    details={'issues': issues},
                    critical=True
                )
                
            return ValidationResult(
                success=True,
                message="Environment validation passed",
                details={'variables': list(env_requirements.keys())},
                critical=True
            )
            
        except Exception as e:
            return ValidationResult(
                success=False,
                message=f"Environment validation error: {str(e)}",
                critical=True
            )
            
    def validate_system_requirements(self) -> ValidationResult:
        """Validate system requirements and permissions
        Critical Path: PreFlight.System
        """
        try:
            issues = []
            
            # Check write permissions
            paths_to_check = [
                self.project_root / 'backend' / 'logs',
                self.project_root / 'backend' / 'app.db',
                self.project_root / 'frontend' / 'dist'
            ]
            
            for path in paths_to_check:
                try:
                    if path.exists():
                        # Try to write a test file
                        test_file = path if path.is_file() else path / '.test'
                        with open(test_file, 'a') as f:
                            f.write('')
                        if test_file.name == '.test':
                            test_file.unlink()
                    else:
                        path.parent.mkdir(parents=True, exist_ok=True)
                except (OSError, PermissionError):
                    issues.append(f"No write permission for {path}")
            
            # Check port availability
            ports_to_check = [8000, 3000]
            for port in ports_to_check:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    sock.bind(('127.0.0.1', port))
                except socket.error:
                    issues.append(f"Port {port} is not available")
                finally:
                    sock.close()
                    
            if issues:
                return ValidationResult(
                    success=False,
                    message="System requirements validation failed",
                    details={'issues': issues},
                    critical=True
                )
                
            return ValidationResult(
                success=True,
                message="System requirements validation passed",
                details={'checked_ports': ports_to_check},
                critical=True
            )
            
        except Exception as e:
            return ValidationResult(
                success=False,
                message=f"System validation error: {str(e)}",
                critical=True
            )
            
    def validate_dependencies(self) -> ValidationResult:
        """Validate all dependencies and their versions
        Critical Path: PreFlight.Dependencies
        """
        try:
            issues = []
            
            # Python dependencies
            requirements_file = self.project_root / 'backend' / 'requirements.txt'
            if not requirements_file.exists():
                issues.append("requirements.txt not found")
            else:
                with open(requirements_file) as f:
                    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                    
                for req in requirements:
                    try:
                        pkg_resources.require(req)
                    except (pkg_resources.DistributionNotFound, pkg_resources.VersionConflict) as e:
                        issues.append(f"Python dependency issue: {str(e)}")
                        
            # Node.js dependencies
            package_json = self.project_root / 'frontend' / 'package.json'
            if not package_json.exists():
                issues.append("package.json not found")
            else:
                try:
                    # Check node and npm versions
                    node_version = subprocess.check_output(['node', '--version']).decode().strip()
                    npm_version = subprocess.check_output(['npm', '--version']).decode().strip()
                    
                    if not node_version.startswith('v'):
                        issues.append("Invalid Node.js version")
                    if not npm_version:
                        issues.append("npm not found")
                        
                except subprocess.CalledProcessError:
                    issues.append("Node.js or npm not installed")
                    
            if issues:
                return ValidationResult(
                    success=False,
                    message="Dependency validation failed",
                    details={'issues': issues},
                    critical=True
                )
                
            return ValidationResult(
                success=True,
                message="Dependency validation passed",
                details={
                    'python_packages': len(requirements),
                    'node_version': node_version if 'node_version' in locals() else None,
                    'npm_version': npm_version if 'npm_version' in locals() else None
                },
                critical=True
            )
            
        except Exception as e:
            return ValidationResult(
                success=False,
                message=f"Dependency validation error: {str(e)}",
                critical=True
            )
            
    def run_all_validations(self) -> Tuple[bool, List[ValidationResult]]:
        """Run all pre-flight validations
        Critical Path: PreFlight.Main
        """
        validations = [
            self.validate_environment,
            self.validate_system_requirements,
            self.validate_dependencies
        ]
        
        all_passed = True
        self.results = []
        
        for validation in validations:
            result = validation()
            self.results.append(result)
            
            if result.critical and not result.success:
                all_passed = False
                
            # Log the result
            log_level = logging.ERROR if not result.success else logging.INFO
            logger.log(log_level, f"{validation.__name__}: {result.message}")
            
            if result.details:
                for key, value in result.details.items():
                    logger.log(log_level, f"  {key}: {value}")
                    
        return all_passed, self.results
