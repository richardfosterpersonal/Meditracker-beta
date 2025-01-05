#!/usr/bin/env python3
"""
Deployment Script
Handles deployment with validation against SINGLE_SOURCE_VALIDATION.md requirements
"""

import os
import sys
import subprocess
import logging
from datetime import datetime
from typing import Dict, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='logs/validation/deployment.log'
)

class Deployer:
    def __init__(self, environment: str):
        self.environment = environment
        self.validation_path = "logs/validation"
        self.evidence_path = f"{self.validation_path}/evidence"
        os.makedirs(self.evidence_path, exist_ok=True)
        
    def deploy(self) -> bool:
        """Run deployment with validation"""
        try:
            # 1. Pre-deployment validation
            if not self._pre_deployment_validation():
                return False
                
            # 2. Environment setup
            if not self._setup_environment():
                return False
                
            # 3. Run deployment
            if not self._run_deployment():
                return False
                
            # 4. Post-deployment validation
            if not self._post_deployment_validation():
                return False
                
            return True
        except Exception as e:
            logging.error(f"Deployment error: {str(e)}")
            return False
    
    def _pre_deployment_validation(self) -> bool:
        """Run pre-deployment validation"""
        logging.info("Running pre-deployment validation...")
        
        # Validate environment
        result = subprocess.run(
            ["python", "scripts/deployment_validation.py", self.environment],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logging.error("Pre-deployment validation failed")
            logging.error(result.stderr)
            return False
            
        # Save validation evidence
        with open(f"{self.evidence_path}/pre_deployment_{self.environment}.log", 'w') as f:
            f.write(result.stdout)
            
        return True
    
    def _setup_environment(self) -> bool:
        """Setup deployment environment"""
        logging.info("Setting up deployment environment...")
        
        # Load environment variables
        env_file = f".env.{self.environment}"
        if not os.path.exists(env_file):
            logging.error(f"Environment file not found: {env_file}")
            return False
            
        # Create required directories
        paths = [
            os.getenv('VALIDATION_EVIDENCE_PATH'),
            os.getenv('SECURITY_EVIDENCE_PATH'),
            'logs/validation',
            'logs/security'
        ]
        
        for path in paths:
            if path:
                os.makedirs(path, exist_ok=True)
                
        return True
    
    def _run_deployment(self) -> bool:
        """Run the actual deployment"""
        logging.info("Running deployment...")
        
        try:
            # Build containers
            subprocess.run(
                ["docker-compose", "build"],
                check=True
            )
            
            # Start services
            subprocess.run(
                ["docker-compose", "up", "-d"],
                check=True
            )
            
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Deployment failed: {str(e)}")
            return False
    
    def _post_deployment_validation(self) -> bool:
        """Run post-deployment validation"""
        logging.info("Running post-deployment validation...")
        
        # Check service health
        services = ['backend', 'frontend', 'monitoring']
        for service in services:
            result = subprocess.run(
                ["docker-compose", "ps", service],
                capture_output=True,
                text=True
            )
            if "Up" not in result.stdout:
                logging.error(f"Service {service} is not running")
                return False
        
        # Validate monitoring
        if os.getenv('MONITORING_ENABLED') == 'true':
            if not self._validate_monitoring():
                return False
        
        return True
    
    def _validate_monitoring(self) -> bool:
        """Validate monitoring setup"""
        try:
            import requests
            response = requests.get(os.getenv('MONITORING_ENDPOINT') + '/health')
            return response.status_code == 200
        except:
            logging.error("Could not validate monitoring")
            return False
    
    def generate_report(self) -> str:
        """Generate deployment report"""
        report = f"""
# Deployment Report
Environment: {self.environment}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Validation Evidence
- Pre-deployment validation: {self.evidence_path}/pre_deployment_{self.environment}.log
- Deployment logs: logs/deployment_{self.environment}.log
- Validation logs: logs/validation/deployment.log

## Status
- Environment: {self.environment}
- Validation: PASSED
- Deployment: COMPLETE
- Evidence: COLLECTED

## Next Steps
1. Monitor application health
2. Review validation evidence
3. Update documentation
4. Sign off deployment
"""
        return report

def main():
    if len(sys.argv) != 2:
        print("Usage: python deploy.py <environment>")
        sys.exit(1)
        
    environment = sys.argv[1].lower()
    if environment not in ['development', 'staging', 'beta', 'production']:
        print(f"Invalid environment: {environment}")
        sys.exit(1)
    
    deployer = Deployer(environment)
    success = deployer.deploy()
    
    if success:
        report = deployer.generate_report()
        report_path = f"logs/validation/deployment_report_{environment}.md"
        with open(report_path, 'w') as f:
            f.write(report)
        print(report)
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
