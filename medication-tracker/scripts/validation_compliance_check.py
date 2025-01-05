#!/usr/bin/env python3
"""
Validation Compliance Checker
Verifies project-wide compliance with SINGLE_SOURCE_VALIDATION.md requirements
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='validation_compliance.log'
)

class ValidationCompliance:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.validation_ref = "SINGLE_SOURCE_VALIDATION.md"
        self.critical_path_components = {
            "medication_safety",
            "data_security",
            "core_infrastructure"
        }
        self.beta_requirements = {
            "security",
            "monitoring",
            "user_management"
        }
        
    def check_file_compliance(self, filepath: str) -> Dict:
        """Check individual file compliance"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        results = {
            "validation_reference": self.validation_ref in content,
            "critical_path_alignment": any(comp in content for comp in self.critical_path_components),
            "beta_requirements": any(req in content for req in self.beta_requirements),
            "security_measures": self._check_security_measures(content),
            "monitoring_support": self._check_monitoring_support(content)
        }
        
        return results
    
    def _check_security_measures(self, content: str) -> bool:
        """Check for security measures in content"""
        security_patterns = [
            r'encryption',
            r'authentication',
            r'authorization',
            r'HIPAA',
            r'security',
            r'validation'
        ]
        return any(re.search(pattern, content, re.I) for pattern in security_patterns)
    
    def _check_monitoring_support(self, content: str) -> bool:
        """Check for monitoring support in content"""
        monitoring_patterns = [
            r'monitoring',
            r'logging',
            r'tracking',
            r'metrics',
            r'performance'
        ]
        return any(re.search(pattern, content, re.I) for pattern in monitoring_patterns)
    
    def scan_project(self) -> Dict:
        """Scan entire project for compliance"""
        results = {
            "compliant_files": [],
            "non_compliant_files": [],
            "summary": {
                "total_files": 0,
                "compliant": 0,
                "non_compliant": 0
            }
        }
        
        for root, _, files in os.walk(self.project_root):
            for file in files:
                if file.endswith(('.py', '.ts', '.js', '.md', '.env', '.yml', '.yaml')):
                    filepath = os.path.join(root, file)
                    try:
                        compliance = self.check_file_compliance(filepath)
                        if all(compliance.values()):
                            results["compliant_files"].append(filepath)
                            results["summary"]["compliant"] += 1
                        else:
                            results["non_compliant_files"].append({
                                "file": filepath,
                                "issues": {k: v for k, v in compliance.items() if not v}
                            })
                            results["summary"]["non_compliant"] += 1
                        results["summary"]["total_files"] += 1
                    except Exception as e:
                        logging.error(f"Error processing {filepath}: {str(e)}")
        
        return results

    def generate_report(self, results: Dict) -> str:
        """Generate compliance report"""
        report = f"""
# Validation Compliance Report
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- Total Files: {results['summary']['total_files']}
- Compliant: {results['summary']['compliant']}
- Non-Compliant: {results['summary']['non_compliant']}
- Compliance Rate: {(results['summary']['compliant'] / results['summary']['total_files'] * 100):.2f}%

## Non-Compliant Files
"""
        for item in results["non_compliant_files"]:
            report += f"\n### {item['file']}\nIssues:\n"
            for issue, _ in item["issues"].items():
                report += f"- Missing: {issue}\n"
        
        return report

def main():
    project_root = "c:/Users/richa/CascadeProjects/medication-tracker"
    checker = ValidationCompliance(project_root)
    results = checker.scan_project()
    
    # Generate and save report
    report = checker.generate_report(results)
    report_path = os.path.join(project_root, "docs/validation/evidence/compliance_report.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    # Log summary
    logging.info(f"Compliance check completed. "
                f"Compliant: {results['summary']['compliant']}, "
                f"Non-Compliant: {results['summary']['non_compliant']}")

if __name__ == "__main__":
    main()
