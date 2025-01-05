"""
Validation Monitoring System
Monitors validation chain health and reports issues
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import json
import logging
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class ValidationMonitor:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.docs_dir = self.project_root / "docs"
        self.validation_dir = self.docs_dir / "validation"
        self.results_dir = self.docs_dir / "validation_results"
        self.results_dir.mkdir(exist_ok=True)
        
        # Setup logging
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration"""
        log_file = self.results_dir / "validation_monitor.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
    
    def check_document_age(self) -> List[str]:
        """Check for outdated documents"""
        issues = []
        current_time = datetime.now()
        max_age = timedelta(days=7)
        
        for doc in self.validation_dir.rglob("*.md"):
            content = doc.read_text()
            timestamp_match = content.split("\n")[1] if len(content.split("\n")) > 1 else None
            
            if not timestamp_match or "Last Updated:" not in timestamp_match:
                issues.append(f"No timestamp found in {doc}")
                continue
            
            try:
                doc_time = datetime.fromisoformat(timestamp_match.split(": ")[1])
                age = current_time - doc_time
                if age > max_age:
                    issues.append(f"Document outdated: {doc} (Age: {age.days} days)")
            except (ValueError, IndexError):
                issues.append(f"Invalid timestamp format in {doc}")
        
        return issues
    
    def check_validation_chain(self) -> List[str]:
        """Check validation chain integrity"""
        issues = []
        chain_file = self.validation_dir / "VALIDATION_CHAIN.json"
        
        if not chain_file.exists():
            return ["Validation chain file missing"]
        
        try:
            with open(chain_file) as f:
                chain = json.load(f)
            
            # Check required fields
            required_fields = {"last_updated", "critical_paths", "validation_status"}
            missing_fields = required_fields - set(chain.keys())
            if missing_fields:
                issues.append(f"Missing fields in validation chain: {missing_fields}")
            
            # Check critical paths exist
            for path_name, path in chain.get("critical_paths", {}).items():
                full_path = self.project_root / path
                if not full_path.exists():
                    issues.append(f"Missing critical path: {path}")
            
        except json.JSONDecodeError:
            issues.append("Invalid JSON in validation chain file")
        except Exception as e:
            issues.append(f"Error checking validation chain: {str(e)}")
        
        return issues
    
    def check_code_alignment(self) -> List[str]:
        """Check code alignment with documentation"""
        issues = []
        
        # Check backend validation files
        backend_dir = self.project_root / "backend" / "app"
        if not backend_dir.exists():
            issues.append("Missing backend directory")
        else:
            validation_files = list(backend_dir.rglob("*validation*.py"))
            if not validation_files:
                issues.append("No validation files found in backend")
        
        # Check frontend validation files
        frontend_dir = self.project_root / "frontend" / "src"
        if not frontend_dir.exists():
            issues.append("Missing frontend directory")
        else:
            validation_files = list(frontend_dir.rglob("*validation*.ts"))
            if not validation_files:
                issues.append("No validation files found in frontend")
        
        return issues
    
    def generate_report(self, issues: List[str]) -> str:
        """Generate validation report"""
        report = ["# Validation Monitor Report", f"Generated: {datetime.now().isoformat()}", ""]
        
        if not issues:
            report.append("✅ All validation checks passed")
        else:
            report.append("❌ Validation issues found:")
            for issue in issues:
                report.append(f"- {issue}")
        
        return "\n".join(report)
    
    def save_report(self, report: str):
        """Save validation report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.results_dir / f"validation_report_{timestamp}.md"
        report_file.write_text(report)
        logging.info(f"Report saved to {report_file}")
    
    def run_monitor(self):
        """Run all validation checks"""
        logging.info("Starting validation monitoring...")
        
        all_issues = []
        
        # Check document age
        age_issues = self.check_document_age()
        if age_issues:
            logging.warning("Document age issues found")
            all_issues.extend(age_issues)
        
        # Check validation chain
        chain_issues = self.check_validation_chain()
        if chain_issues:
            logging.warning("Validation chain issues found")
            all_issues.extend(chain_issues)
        
        # Check code alignment
        alignment_issues = self.check_code_alignment()
        if alignment_issues:
            logging.warning("Code alignment issues found")
            all_issues.extend(alignment_issues)
        
        # Generate and save report
        report = self.generate_report(all_issues)
        self.save_report(report)
        
        if all_issues:
            logging.error(f"Validation issues found: {len(all_issues)}")
            return False
        else:
            logging.info("All validation checks passed")
            return True

def main():
    """Main entry point"""
    monitor = ValidationMonitor()
    if not monitor.run_monitor():
        sys.exit(1)

if __name__ == "__main__":
    main()
