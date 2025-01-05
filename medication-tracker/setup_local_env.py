"""Local Development Environment Setup with Validation

This script sets up the local development environment while adhering to
validation requirements specified in VALIDATION-DEV-* and VALIDATION-BETA-*.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('setup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class LocalEnvironmentSetup:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backend_dir = self.root_dir / 'backend'
        self.frontend_dir = self.root_dir / 'frontend'
        self.validation_script = self.backend_dir / 'scripts' / 'validation_checkpoint.py'

    def setup_python_environment(self) -> bool:
        """Set up Python environment and dependencies"""
        try:
            logging.info("Setting up Python environment...")
            
            # Install backend dependencies
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r',
                str(self.backend_dir / 'requirements.txt')
            ], check=True)
            
            # Install development dependencies
            dev_requirements = [
                'pytest==7.4.3',
                'pytest-cov==4.1.0',
                'debugpy==1.8.0',
                'black==23.11.0',
                'mypy==1.7.1'
            ]
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', *dev_requirements
            ], check=True)
            
            logging.info("✓ Python environment setup complete")
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to set up Python environment: {str(e)}")
            return False

    def setup_node_environment(self) -> bool:
        """Set up Node.js environment and dependencies"""
        try:
            logging.info("Setting up Node.js environment...")
            
            # Install frontend dependencies
            os.chdir(self.frontend_dir)
            subprocess.run(['npm', 'install'], check=True)
            
            # Install development dependencies
            dev_dependencies = [
                '@types/react',
                '@types/react-dom',
                '@testing-library/react',
                '@testing-library/jest-dom'
            ]
            subprocess.run(['npm', 'install', '--save-dev', *dev_dependencies], check=True)
            
            logging.info("✓ Node.js environment setup complete")
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to set up Node.js environment: {str(e)}")
            return False

    def setup_database(self) -> bool:
        """Set up local database"""
        try:
            logging.info("Setting up local database...")
            
            # Run database migrations
            os.chdir(self.backend_dir)
            subprocess.run([
                sys.executable, '-m', 'alembic', 'upgrade', 'head'
            ], check=True)
            
            logging.info("✓ Database setup complete")
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to set up database: {str(e)}")
            return False

    def configure_environment_variables(self) -> bool:
        """Configure environment variables"""
        try:
            logging.info("Configuring environment variables...")
            
            env_vars = {
                'DATABASE_URL': 'postgresql://localhost/medication_tracker',
                'SECRET_KEY': 'dev_secret_key',
                'API_KEY': 'dev_api_key',
                'ENVIRONMENT': 'development'
            }
            
            # Update .env file
            with open(self.backend_dir / '.env', 'w') as f:
                for key, value in env_vars.items():
                    f.write(f'{key}={value}\n')
            
            logging.info("✓ Environment variables configured")
            return True
        except Exception as e:
            logging.error(f"Failed to configure environment variables: {str(e)}")
            return False

    def run_validation_checkpoint(self) -> bool:
        """Run validation checkpoint script"""
        try:
            logging.info("Running validation checkpoint...")
            
            result = subprocess.run([
                sys.executable, str(self.validation_script)
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                logging.info("✅ Validation checkpoint passed")
                return True
            else:
                logging.error("❌ Validation checkpoint failed")
                logging.error(result.stderr)
                return False
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to run validation checkpoint: {str(e)}")
            return False

    def setup_environment(self) -> bool:
        """Set up complete local development environment"""
        setup_steps = [
            ("Python Environment", self.setup_python_environment),
            ("Node.js Environment", self.setup_node_environment),
            ("Database", self.setup_database),
            ("Environment Variables", self.configure_environment_variables),
            ("Validation Checkpoint", self.run_validation_checkpoint)
        ]
        
        success = True
        for step_name, step_func in setup_steps:
            logging.info(f"\nExecuting setup step: {step_name}")
            if not step_func():
                logging.error(f"❌ {step_name} setup failed")
                success = False
                break
            logging.info(f"✓ {step_name} setup completed successfully")
        
        if success:
            logging.info("\n✅ Local development environment setup completed successfully!")
        else:
            logging.error("\n❌ Local development environment setup failed!")
        
        return success

if __name__ == "__main__":
    setup = LocalEnvironmentSetup()
    if not setup.setup_environment():
        sys.exit(1)
