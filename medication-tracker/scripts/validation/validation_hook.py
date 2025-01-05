"""
Critical Path Validation Hook
Last Updated: 2024-12-25T20:40:07+01:00
Status: CRITICAL
Reference: ../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This module implements the validation hook system that ensures:
1. Critical Path Alignment: All documents and code stay in sync
2. Single Source of Truth: Maintains version consistency
3. Validation Chain: Enforces update propagation
"""

import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set

class ValidationHook:
    """
    Validation Hook System
    Critical Path: Version Control
    """
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.logger = logging.getLogger(__name__)
        self.critical_path_file = self.project_root / "docs/validation/critical_path/MASTER_CRITICAL_PATH.md"
        self.version_pattern = re.compile(r"Last Updated: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})")
        
    def scan_for_references(self) -> Dict[str, str]:
        """
        Scan all files for critical path references.
        Critical Path: Reference Tracking
        """
        references = {}
        
        for path in self.project_root.rglob("*"):
            if path.is_file() and path.suffix in ['.py', '.ts', '.tsx', '.md', '.css']:
                try:
                    content = path.read_text()
                    if "Reference: " in content:
                        match = self.version_pattern.search(content)
                        if match:
                            references[str(path)] = match.group(1)
                except Exception as e:
                    self.logger.error(f"Error scanning {path}: {str(e)}")
                    
        return references
        
    def get_critical_path_version(self) -> str:
        """
        Get current critical path version.
        Critical Path: Version Control
        """
        try:
            content = self.critical_path_file.read_text()
            match = self.version_pattern.search(content)
            if match:
                return match.group(1)
            raise ValueError("No version found in critical path")
        except Exception as e:
            self.logger.error(f"Error reading critical path: {str(e)}")
            raise
            
    def validate_references(self) -> Dict[str, List[str]]:
        """
        Validate all references against critical path.
        Critical Path: Validation Chain
        """
        current_version = self.get_critical_path_version()
        references = self.scan_for_references()
        
        validation_results = {
            "outdated": [],
            "aligned": [],
            "invalid": []
        }
        
        for file_path, version in references.items():
            try:
                if version != current_version:
                    validation_results["outdated"].append(file_path)
                else:
                    validation_results["aligned"].append(file_path)
            except Exception as e:
                validation_results["invalid"].append(file_path)
                self.logger.error(f"Error validating {file_path}: {str(e)}")
                
        return validation_results
        
    def update_reference(self, file_path: str, new_version: str) -> bool:
        """
        Update reference in file to new version.
        Critical Path: Version Update
        """
        try:
            path = Path(file_path)
            content = path.read_text()
            updated = self.version_pattern.sub(f"Last Updated: {new_version}", content)
            path.write_text(updated)
            return True
        except Exception as e:
            self.logger.error(f"Error updating {file_path}: {str(e)}")
            return False
            
    def generate_validation_report(self) -> Dict:
        """
        Generate validation status report.
        Critical Path: Documentation
        """
        try:
            current_version = self.get_critical_path_version()
            results = self.validate_references()
            
            report = {
                "timestamp": datetime.utcnow().isoformat(),
                "critical_path_version": current_version,
                "validation_status": {
                    "total_files": len(results["aligned"]) + len(results["outdated"]) + len(results["invalid"]),
                    "aligned_files": len(results["aligned"]),
                    "outdated_files": len(results["outdated"]),
                    "invalid_files": len(results["invalid"])
                },
                "details": results
            }
            
            # Save report
            report_path = self.project_root / "docs/validation/reports/validation_status.json"
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(report, indent=2))
            
            return report
        except Exception as e:
            self.logger.error(f"Error generating report: {str(e)}")
            raise
            
    def run_validation_hook(self) -> bool:
        """
        Run complete validation process.
        Critical Path: Validation Process
        """
        try:
            self.logger.info("Starting validation hook")
            current_version = self.get_critical_path_version()
            results = self.validate_references()
            
            # Update outdated files
            for file_path in results["outdated"]:
                self.update_reference(file_path, current_version)
                
            # Generate report
            report = self.generate_validation_report()
            
            # Log results
            self.logger.info(f"Validation complete: {len(results['aligned'])} aligned, "
                           f"{len(results['outdated'])} updated, "
                           f"{len(results['invalid'])} invalid")
            
            return True
        except Exception as e:
            self.logger.error(f"Validation hook failed: {str(e)}")
            return False
            
    def watch_critical_path(self):
        """
        Watch for critical path changes.
        Critical Path: Change Detection
        """
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
            
            class CriticalPathHandler(FileSystemEventHandler):
                def __init__(self, hook):
                    self.hook = hook
                    
                def on_modified(self, event):
                    if event.src_path == str(self.hook.critical_path_file):
                        self.hook.logger.info("Critical path modified, running validation")
                        self.hook.run_validation_hook()
            
            observer = Observer()
            observer.schedule(CriticalPathHandler(self), 
                           str(self.critical_path_file.parent), 
                           recursive=False)
            observer.start()
            
            self.logger.info("Started watching critical path for changes")
            return observer
        except Exception as e:
            self.logger.error(f"Error setting up watch: {str(e)}")
            raise
