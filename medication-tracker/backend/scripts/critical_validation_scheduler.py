"""
Critical Validation Scheduler
Last Updated: 2024-12-25T23:05:59+01:00
Critical Path: Tools.Validation

Automated scheduler for critical path validation with priority-based execution.
"""

import os
import sys
import time
import logging
import schedule
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Set
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from app.core.critical_validation import get_validator
from app.core.validation_metrics import get_metrics_collector

logger = logging.getLogger(__name__)

class ValidationScheduler:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.validator = get_validator()
        self.metrics_collector = get_metrics_collector()
        self.last_run: Dict[str, datetime] = {}
        self.critical_components = {
            'medication_safety': {
                'path': 'backend/app/validation/medication_safety',
                'frequency_hours': 4,  # Check every 4 hours
                'priority': 1  # Highest priority
            },
            'security': {
                'path': 'backend/app/security',
                'frequency_hours': 6,
                'priority': 2
            },
            'core': {
                'path': 'backend/app/core',
                'frequency_hours': 8,
                'priority': 3
            }
        }
        
    def schedule_validations(self):
        """Schedule all validation jobs"""
        # Schedule based on priority and frequency
        for component, config in self.critical_components.items():
            hours = config['frequency_hours']
            schedule.every(hours).hours.do(
                self.validate_component,
                component,
                config['path']
            )
            
        # Schedule daily report
        schedule.every().day.at("00:00").do(self.generate_daily_report)
        
        # Schedule weekly deep validation
        schedule.every().sunday.at("02:00").do(self.deep_validation)
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            
    def validate_component(self, component: str, path: str) -> bool:
        """Validate a critical component"""
        logger.info(f"Starting validation of {component}")
        
        try:
            # Skip if recently validated (unless forced)
            if component in self.last_run:
                time_since_last = datetime.now() - self.last_run[component]
                min_interval = timedelta(
                    hours=self.critical_components[component]['frequency_hours']
                )
                if time_since_last < min_interval:
                    logger.info(f"Skipping {component} - recently validated")
                    return True
            
            # Perform validation
            full_path = self.project_root / path
            results = self.validator.validate_critical_component(str(full_path))
            
            # Update last run time
            self.last_run[component] = datetime.now()
            
            # Save results
            self._save_validation_results(component, results)
            
            # Handle critical issues
            if results['critical_issues']:
                self._handle_critical_issues(component, results)
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating {component}: {str(e)}")
            return False
            
    def _save_validation_results(self, component: str, results: Dict):
        """Save validation results"""
        results_dir = self.project_root / 'docs' / 'validation_results'
        results_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = results_dir / f"{component}_validation_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
            
    def _handle_critical_issues(self, component: str, results: Dict):
        """Handle critical validation issues"""
        # Log issues
        logger.error(f"Critical issues found in {component}:")
        for issue in results['critical_issues']:
            logger.error(f"- {issue}")
            
        # Create issue report
        report_dir = self.project_root / 'docs' / 'reports'
        report_dir.mkdir(parents=True, exist_ok=True)
        
        report_file = report_dir / f"{component}_issues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_file, 'w') as f:
            f.write(f"# Critical Issues Report: {component}\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            f.write("## Critical Issues\n")
            for issue in results['critical_issues']:
                f.write(f"- {issue}\n")
                
            f.write("\n## Recommendations\n")
            for rec in results['recommendations']:
                f.write(f"- {rec}\n")
                
            f.write(f"\n## Validation Scores\n")
            f.write(f"- Safety: {results['overall_safety_score']:.2f}\n")
            f.write(f"- Security: {results['overall_security_score']:.2f}\n")
            f.write(f"- Reliability: {results['overall_reliability_score']:.2f}\n")
    
    def generate_daily_report(self):
        """Generate daily validation report"""
        logger.info("Generating daily validation report")
        
        report = [
            "# Daily Validation Report",
            f"Generated: {datetime.now().isoformat()}",
            "",
            "## Component Status"
        ]
        
        for component, config in self.critical_components.items():
            last_run = self.last_run.get(component, "Never")
            if isinstance(last_run, datetime):
                last_run = last_run.isoformat()
                
            report.extend([
                f"### {component}",
                f"- Last Validated: {last_run}",
                f"- Frequency: Every {config['frequency_hours']} hours",
                f"- Priority: {config['priority']}"
            ])
            
        # Save report
        report_dir = self.project_root / 'docs' / 'reports'
        report_dir.mkdir(parents=True, exist_ok=True)
        
        report_file = report_dir / f"daily_validation_{datetime.now().strftime('%Y%m%d')}.md"
        with open(report_file, 'w') as f:
            f.write('\n'.join(report))
            
    def deep_validation(self):
        """Perform weekly deep validation"""
        logger.info("Starting weekly deep validation")
        
        # Validate all components
        for component, config in self.critical_components.items():
            self.validate_component(component, config['path'])
            
        # Generate comprehensive report
        report_dir = self.project_root / 'docs' / 'reports'
        report_dir.mkdir(parents=True, exist_ok=True)
        
        report_file = report_dir / f"deep_validation_{datetime.now().strftime('%Y%m%d')}.md"
        
        with open(report_file, 'w') as f:
            f.write("# Weekly Deep Validation Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            for component in self.critical_components:
                f.write(f"## {component}\n")
                # Add detailed component analysis
                
def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python critical_validation_scheduler.py <project_root>")
        sys.exit(1)
        
    project_root = sys.argv[1]
    if not os.path.isdir(project_root):
        print(f"Error: {project_root} is not a directory")
        sys.exit(1)
        
    scheduler = ValidationScheduler(project_root)
    
    try:
        scheduler.schedule_validations()
    except KeyboardInterrupt:
        logger.info("Stopping validation scheduler")
        sys.exit(0)

if __name__ == '__main__':
    main()
