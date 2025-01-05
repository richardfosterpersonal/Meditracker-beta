"""
Validation Record Keeper
Critical Path: Records.Management
Last Updated: 2025-01-02T10:59:41+01:00

Maintains validation records and documentation
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

from .validation_types import ValidationResult, ValidationStatus, ValidationLevel
from .validation_hooks import ValidationStage, ValidationHookPriority

logger = logging.getLogger(__name__)

class ValidationRecordKeeper:
    """Maintains validation records and documentation"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.records_dir = project_root / 'docs' / 'validation' / 'records'
        self.records_dir.mkdir(parents=True, exist_ok=True)
        
    def record_event(self, event: ValidationResult) -> None:
        """Record a validation event and update documentation"""
        try:
            # Generate record filename
            timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%S%z")
            record_file = self.records_dir / f"validation_{timestamp}.json"
            
            # Create record
            record = {
                "timestamp": timestamp,
                "valid": event.valid,
                "level": event.level.value,
                "status": event.status.value,
                "message": event.message,
                "details": event.details,
                "evidence_id": event.evidence_id
            }
            
            # Write record
            with open(record_file, 'w') as f:
                json.dump(record, f, indent=2)
                
            # Update validation status
            self._update_validation_status(event)
            
            # Update documentation
            self._update_documentation(event)
            
            logger.info(f"Recorded validation event: {record_file}")
            
        except Exception as e:
            logger.error(f"Failed to record validation event: {str(e)}")
            
    def _update_validation_status(self, event: ValidationResult) -> None:
        """Update the current validation status file"""
        try:
            status_file = self.records_dir / "validation_status.json"
            
            # Load existing status
            if status_file.exists():
                with open(status_file) as f:
                    status = json.load(f)
            else:
                status = {
                    "last_updated": "",
                    "overall_status": "unknown",
                    "stages": {}
                }
                
            # Update status
            status["last_updated"] = datetime.utcnow().isoformat()
            status["overall_status"] = "passed" if event.valid else "failed"
            
            # Update stage status if available
            if event.details and "stage" in event.details:
                stage = event.details["stage"]
                status["stages"][stage] = {
                    "status": event.status.value,
                    "message": event.message,
                    "priority": event.details.get("priority", "medium"),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            # Write updated status
            with open(status_file, 'w') as f:
                json.dump(status, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to update validation status: {str(e)}")
            
    def _update_documentation(self, event: ValidationResult) -> None:
        """Update relevant documentation based on the event"""
        try:
            # Update README status
            self._update_readme_status()
            
            # If validation failed, update known issues
            if not event.valid:
                issues_file = self.project_root / "docs" / "known_issues.md"
                
                # Create issues file if it doesn't exist
                if not issues_file.exists():
                    issues_file.parent.mkdir(parents=True, exist_ok=True)
                    with open(issues_file, 'w') as f:
                        f.write("# Known Validation Issues\n\n")
                        
                # Append issue
                with open(issues_file, 'a') as f:
                    f.write(f"\n## {event.message}\n")
                    f.write(f"- Status: {event.status.value}\n")
                    f.write(f"- Level: {event.level.value}\n")
                    f.write(f"- Timestamp: {datetime.utcnow().isoformat()}\n")
                    if event.details:
                        f.write("- Details:\n")
                        for key, value in event.details.items():
                            f.write(f"  - {key}: {value}\n")
                            
        except Exception as e:
            logger.error(f"Failed to update documentation: {str(e)}")
            
    def _update_readme_status(self) -> None:
        """Update validation status in README"""
        try:
            readme_file = self.project_root / "README.md"
            
            if not readme_file.exists():
                return
                
            # Read current README
            with open(readme_file) as f:
                content = f.read()
                
            # Find validation status section
            status_start = content.find("## Validation Status")
            if status_start == -1:
                # Add section if it doesn't exist
                content += "\n\n## Validation Status\n\n"
                status_start = content.find("## Validation Status")
                
            # Find next section
            next_section = content.find("##", status_start + 2)
            if next_section == -1:
                next_section = len(content)
                
            # Get status from latest validation
            status_file = self.records_dir / "validation_status.json"
            if status_file.exists():
                with open(status_file) as f:
                    status = json.load(f)
                    
                # Create status section
                status_section = "## Validation Status\n\n"
                status_section += f"Last Updated: {status['last_updated']}\n"
                status_section += f"Overall Status: {status['overall_status'].upper()}\n\n"
                
                if status["stages"]:
                    status_section += "### Stage Status\n\n"
                    for stage, details in status["stages"].items():
                        status_section += f"- {stage}: {details['status']}\n"
                        status_section += f"  - {details['message']}\n"
                        status_section += f"  - Priority: {details['priority']}\n"
                        status_section += f"  - Last Updated: {details['timestamp']}\n\n"
                        
                # Update README
                new_content = (
                    content[:status_start] +
                    status_section +
                    content[next_section:]
                )
                
                with open(readme_file, 'w') as f:
                    f.write(new_content)
                    
        except Exception as e:
            logger.error(f"Failed to update README status: {str(e)}")
            
    def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent validation events"""
        try:
            # Get all record files
            records = sorted(
                self.records_dir.glob("validation_*.json"),
                reverse=True
            )
            
            # Load recent records
            recent = []
            for record in records[:limit]:
                with open(record) as f:
                    recent.append(json.load(f))
                    
            return recent
            
        except Exception as e:
            logger.error(f"Failed to get recent events: {str(e)}")
            return []
