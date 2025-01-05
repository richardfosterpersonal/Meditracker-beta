#!/usr/bin/env python3
"""
Deployment Validation Script
Validates deployment configuration against SINGLE_SOURCE_VALIDATION.md requirements
"""

import os
import sys
import json
import logging
import requests
from typing import Dict, List, Set
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='logs/validation/deployment_validation.log'
)

class DeploymentValidator:
    def __init__(self, environment: str):
        self.environment = environment
        self.validation_errors = []
        self.validation_warnings = []
        
    def validate_environment(self) -> bool:
        """Validate environment configuration"""
        try:
            # Load environment variables
            self._validate_required_vars()
            self._validate_monitoring_setup()
            self._validate_security_settings()
            self._validate_evidence_paths()
            
            if self.environment in ['beta', 'production']:
                self._validate_alert_configuration()
            
            return len(self.validation_errors) == 0
        except Exception as e:
            logging.error(f"Validation error: {str(e)}")
            return False
    
    def _validate_required_vars(self):
        """Validate required environment variables"""
        required_vars = {
            'development': {
                'VALIDATION_ENABLED',
                'VALIDATION_LOG_LEVEL',
                'VALIDATION_EVIDENCE_PATH',
                'MONITORING_ENABLED',
                'MONITORING_ENDPOINT',
                'SECURITY_SCAN_ENABLED'
            },
            'staging': {
                'VALIDATION_ENABLED',
                'VALIDATION_LOG_LEVEL',
                'VALIDATION_EVIDENCE_PATH',
                'VALIDATION_CHECKPOINTS_ENABLED',
                'MONITORING_ENABLED',
                'MONITORING_ENDPOINT',
                'MONITORING_INTERVAL',
                'SECURITY_SCAN_ENABLED',
                'SECURITY_SCAN_INTERVAL'
            },
            'beta': {
                'VALIDATION_ENABLED',
                'VALIDATION_LOG_LEVEL',
                'VALIDATION_EVIDENCE_PATH',
                'VALIDATION_CHECKPOINTS_ENABLED',
                'MONITORING_ENABLED',
                'MONITORING_ENDPOINT',
                'MONITORING_INTERVAL',
                'SECURITY_SCAN_ENABLED',
                'SECURITY_SCAN_INTERVAL',
                'SECURITY_EVIDENCE_PATH',
                'ALERT_WEBHOOK',
                'ALERT_LEVEL'
            }
        }
        
        env_vars = required_vars.get(self.environment, set())
        for var in env_vars:
            if not os.getenv(var):
                self.validation_errors.append(f"Missing required variable: {var}")
    
    def _validate_monitoring_setup(self):
        """Validate monitoring configuration"""
        if os.getenv('MONITORING_ENABLED') == 'true':
            endpoint = os.getenv('MONITORING_ENDPOINT')
            try:
                response = requests.get(endpoint + '/health')
                if response.status_code != 200:
                    self.validation_errors.append(f"Monitoring endpoint health check failed: {endpoint}")
            except:
                self.validation_warnings.append(f"Could not connect to monitoring endpoint: {endpoint}")
    
    def _validate_security_settings(self):
        """Validate security settings"""
        if os.getenv('SECURITY_SCAN_ENABLED') == 'true':
            interval = os.getenv('SECURITY_SCAN_INTERVAL')
            if interval and int(interval) < 1800 and self.environment in ['beta', 'production']:
                self.validation_errors.append("Security scan interval too short for environment")
    
    def _validate_evidence_paths(self):
        """Validate evidence collection paths"""
        paths = [
            os.getenv('VALIDATION_EVIDENCE_PATH'),
            os.getenv('SECURITY_EVIDENCE_PATH')
        ]
        
        for path in paths:
            if path and not os.path.exists(path):
                try:
                    os.makedirs(path)
                except:
                    self.validation_errors.append(f"Could not create evidence path: {path}")
    
    def _validate_alert_configuration(self):
        """Validate alert configuration"""
        webhook = os.getenv('ALERT_WEBHOOK')
        if webhook:
            try:
                response = requests.post(webhook + '/test')
                if response.status_code not in [200, 201]:
                    self.validation_errors.append("Alert webhook test failed")
            except:
                self.validation_warnings.append("Could not verify alert webhook")
    
    def generate_report(self) -> str:
        """Generate validation report"""
        report = f"""
# Deployment Validation Report
Environment: {self.environment}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Validation Status
Status: {"FAILED" if self.validation_errors else "PASSED"}

## Errors
{"No errors found." if not self.validation_errors else ""}
{"".join([f"- {error}\\n" for error in self.validation_errors])}

## Warnings
{"No warnings found." if not self.validation_warnings else ""}
{"".join([f"- {warning}\\n" for warning in self.validation_warnings])}
"""
        return report

def main():
    if len(sys.argv) != 2:
        print("Usage: python deployment_validation.py <environment>")
        sys.exit(1)
        
    environment = sys.argv[1].lower()
    if environment not in ['development', 'staging', 'beta', 'production']:
        print(f"Invalid environment: {environment}")
        sys.exit(1)
    
    validator = DeploymentValidator(environment)
    is_valid = validator.validate_environment()
    
    # Generate and save report
    report = validator.generate_report()
    report_path = f"logs/validation/deployment_validation_{environment}.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(report)
    sys.exit(0 if is_valid else 1)

if __name__ == "__main__":
    main()
