"""
Test Environment Validator
Last Updated: 2025-01-01T21:42:25+01:00
"""

import sys
import importlib
from pathlib import Path
import logging
from typing import Dict, List, Set

logger = logging.getLogger(__name__)

class TestEnvironmentValidator:
    """Validates the test environment before running tests"""
    
    def __init__(self):
        self.required_packages = {
            'pytest': '>=7.0.0',
            'pytest-asyncio': '>=0.21.0',
            'pyyaml': '>=6.0.0',
            'typing-extensions': '>=4.0.0'
        }
        
        self.required_paths = [
            Path('app/core'),
            Path('app/tests'),
            Path('app/validation'),
            Path('app/exceptions.py')
        ]
        
    def validate_python_version(self) -> bool:
        """Validate Python version"""
        required_version = (3, 8)
        current_version = sys.version_info[:2]
        
        if current_version < required_version:
            logger.error(
                f"Python {required_version[0]}.{required_version[1]} or higher required, "
                f"but {current_version[0]}.{current_version[1]} found"
            )
            return False
        return True
        
    def validate_packages(self) -> bool:
        """Validate required packages are installed with correct versions"""
        missing_packages = []
        version_mismatches = []
        
        for package, version in self.required_packages.items():
            try:
                importlib.import_module(package)
            except ImportError:
                missing_packages.append(package)
                continue
                
            # TODO: Add version validation
            
        if missing_packages:
            logger.error(f"Missing required packages: {', '.join(missing_packages)}")
            logger.info("Run 'pip install -r test_requirements.txt' to install dependencies")
            return False
            
        if version_mismatches:
            logger.error(f"Version mismatches: {', '.join(version_mismatches)}")
            return False
            
        return True
        
    def validate_paths(self) -> bool:
        """Validate required paths exist"""
        missing_paths = []
        
        for path in self.required_paths:
            if not path.exists():
                missing_paths.append(str(path))
                
        if missing_paths:
            logger.error(f"Missing required paths: {', '.join(missing_paths)}")
            return False
            
        return True
        
    def generate_requirements_file(self) -> None:
        """Generate test_requirements.txt file"""
        requirements_path = Path('test_requirements.txt')
        
        with open(requirements_path, 'w') as f:
            for package, version in self.required_packages.items():
                f.write(f"{package}{version}\n")
                
        logger.info(f"Generated {requirements_path}")
        
    def validate_all(self) -> bool:
        """Run all validations"""
        logger.info("Validating test environment...")
        
        validations = [
            (self.validate_python_version, "Python version"),
            (self.validate_packages, "Required packages"),
            (self.validate_paths, "Required paths")
        ]
        
        all_passed = True
        for validator, name in validations:
            try:
                if not validator():
                    logger.error(f"{name} validation failed")
                    all_passed = False
                else:
                    logger.info(f"{name} validation passed")
            except Exception as e:
                logger.error(f"{name} validation error: {str(e)}")
                all_passed = False
                
        if not all_passed:
            self.generate_requirements_file()
            logger.error("Test environment validation failed")
            return False
            
        logger.info("Test environment validation passed")
        return True

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    validator = TestEnvironmentValidator()
    if not validator.validate_all():
        sys.exit(1)
