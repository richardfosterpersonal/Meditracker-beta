"""
Environment Validation Chain
Critical Path: VALIDATION-ENV-CHAIN-*
Last Updated: 2024-12-26T22:39:16+01:00
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pathlib import Path
import json
from ...core.logging import beta_logger
from ...core.exceptions import ValidationError

class ValidationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ValidationPriority(Enum):
    HIGHEST = "highest"  # Medication Safety
    HIGH = "high"       # Security and Infrastructure
    MEDIUM = "medium"   # Environment and Configuration
    LOW = "low"        # Optional Features

class ValidationComponent(Enum):
    MED = "medication"    # Medication Safety (HIGHEST)
    SEC = "security"      # Security (HIGH)
    SYS = "system"        # Infrastructure (HIGH)
    ENV = "environment"   # Environment
    PRE = "pre"          # Pre-validation

class ValidationType(Enum):
    CORE = "core"    # Core functionality
    CHECK = "check"  # Validation check
    PROC = "proc"    # Process validation
    EVID = "evid"    # Evidence collection

class ValidationEvidence:
    def __init__(
        self,
        validation_code: str,
        component: ValidationComponent,
        type: ValidationType,
        priority: ValidationPriority,
        timestamp: str
    ):
        self.validation_code = validation_code
        self.component = component
        self.type = type
        self.priority = priority
        self.timestamp = timestamp
        self.status = ValidationStatus.PENDING
        self.evidence = {}
        self.logs = []
        self._create_evidence_file()

    def _create_evidence_file(self) -> None:
        """Create evidence file in standard format"""
        try:
            evidence_dir = Path(__file__).parent.parent.parent.parent.parent / "docs" / "validation" / "evidence"
            evidence_dir.mkdir(parents=True, exist_ok=True)

            evidence_file = evidence_dir / f"{datetime.now().strftime('%Y-%m-%d')}_{self.component.value}_{self.type.value}.md"
            
            if not evidence_file.exists():
                content = f"""# Validation Evidence: {self.validation_code}
Last Updated: {self.timestamp}
Status: {self.status.value}
Component: {self.component.value}
Type: {self.type.value}
Priority: {self.priority.value}

## Critical Path Reference
- Component: {self.component.value}
- Priority: {self.priority.value}
- Type: {self.type.value}

## Validation Requirements
- Code: {self.validation_code}
- Status: {self.status.value}
- Timestamp: {self.timestamp}

## Test Results
```json
{{
    "status": "{self.status.value}",
    "timestamp": "{self.timestamp}",
    "evidence": {{}}
}}
```

## Chain Evidence
```json
{{
    "validation_code": "{self.validation_code}",
    "component": "{self.component.value}",
    "type": "{self.type.value}",
    "priority": "{self.priority.value}",
    "status": "{self.status.value}",
    "timestamp": "{self.timestamp}"
}}
```

## Sign-off Documentation
- [ ] Technical Review
- [ ] Security Review
- [ ] Compliance Review
"""
                evidence_file.write_text(content)

        except Exception as e:
            beta_logger.error(
                "failed_to_create_evidence_file",
                error=str(e),
                validation_code=self.validation_code
            )

    def add_evidence(self, key: str, value: str) -> None:
        """Add evidence with timestamp"""
        self.evidence[key] = {
            "value": value,
            "timestamp": datetime.utcnow().isoformat()
        }
        self._update_evidence_file()

    def add_log(self, message: str, level: str = "info") -> None:
        """Add log entry with timestamp"""
        self.logs.append({
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat()
        })
        self._update_evidence_file()

    def update_status(self, status: ValidationStatus) -> None:
        """Update validation status"""
        self.status = status
        self.add_log(f"Status updated to {status.value}")
        self._update_evidence_file()

    def _update_evidence_file(self) -> None:
        """Update evidence file with latest data"""
        try:
            evidence_dir = Path(__file__).parent.parent.parent.parent.parent / "docs" / "validation" / "evidence"
            evidence_file = evidence_dir / f"{datetime.now().strftime('%Y-%m-%d')}_{self.component.value}_{self.type.value}.md"

            if evidence_file.exists():
                content = evidence_file.read_text()
                
                # Update Test Results
                test_results = {
                    "status": self.status.value,
                    "timestamp": datetime.utcnow().isoformat(),
                    "evidence": self.evidence,
                    "logs": self.logs
                }
                content = self._update_section(
                    content,
                    "Test Results",
                    f"```json\n{json.dumps(test_results, indent=2)}\n```"
                )

                # Update Chain Evidence
                chain_evidence = {
                    "validation_code": self.validation_code,
                    "component": self.component.value,
                    "type": self.type.value,
                    "priority": self.priority.value,
                    "status": self.status.value,
                    "timestamp": datetime.utcnow().isoformat(),
                    "evidence_count": len(self.evidence),
                    "log_count": len(self.logs)
                }
                content = self._update_section(
                    content,
                    "Chain Evidence",
                    f"```json\n{json.dumps(chain_evidence, indent=2)}\n```"
                )

                evidence_file.write_text(content)

        except Exception as e:
            beta_logger.error(
                "failed_to_update_evidence_file",
                error=str(e),
                validation_code=self.validation_code
            )

    def _update_section(self, content: str, section: str, new_content: str) -> str:
        """Update a specific section in the markdown file"""
        lines = content.split("\n")
        start_idx = -1
        end_idx = -1

        # Find section
        for i, line in enumerate(lines):
            if line.startswith(f"## {section}"):
                start_idx = i
            elif start_idx != -1 and i > start_idx and line.startswith("## "):
                end_idx = i
                break

        if start_idx != -1:
            if end_idx == -1:
                end_idx = len(lines)

            # Replace section content
            return "\n".join(
                lines[:start_idx + 1] +
                [""] +
                [new_content] +
                [""] +
                lines[end_idx:]
            )

        return content

class ValidationChain:
    def __init__(self):
        self.logger = beta_logger
        self.evidence_chain: Dict[str, ValidationEvidence] = {}
        self.current_validation: Optional[str] = None

    def start_validation(
        self,
        validation_code: str,
        component: Optional[ValidationComponent] = None,
        type: Optional[ValidationType] = None,
        priority: Optional[ValidationPriority] = None
    ) -> None:
        """Start a new validation in the chain"""
        # Parse validation code if components not provided
        if not all([component, type, priority]):
            code_parts = validation_code.split("-")
            if len(code_parts) >= 4:
                component = ValidationComponent[code_parts[1]]
                type = ValidationType[code_parts[2]]
                priority = (
                    ValidationPriority.HIGHEST if component == ValidationComponent.MED
                    else ValidationPriority.HIGH if component in [ValidationComponent.SEC, ValidationComponent.SYS]
                    else ValidationPriority.MEDIUM
                )

        if not all([component, type, priority]):
            raise ValidationError("Invalid validation code format")

        self.current_validation = validation_code
        self.evidence_chain[validation_code] = ValidationEvidence(
            validation_code=validation_code,
            component=component,
            type=type,
            priority=priority,
            timestamp=datetime.utcnow().isoformat()
        )
        self.logger.info(
            "validation_started",
            validation_code=validation_code,
            component=component.value,
            type=type.value,
            priority=priority.value
        )

    def add_evidence(self, key: str, value: str) -> None:
        """Add evidence to current validation"""
        if not self.current_validation:
            raise ValidationError("No active validation")
        
        evidence = self.evidence_chain[self.current_validation]
        evidence.add_evidence(key, value)
        self.logger.info(
            "evidence_added",
            validation_code=self.current_validation,
            key=key
        )

    def add_log(self, message: str, level: str = "info") -> None:
        """Add log to current validation"""
        if not self.current_validation:
            raise ValidationError("No active validation")
        
        evidence = self.evidence_chain[self.current_validation]
        evidence.add_log(message, level)
        self.logger.log(
            level,
            message,
            validation_code=self.current_validation
        )

    def complete_validation(self, status: ValidationStatus) -> None:
        """Complete current validation"""
        if not self.current_validation:
            raise ValidationError("No active validation")
        
        evidence = self.evidence_chain[self.current_validation]
        evidence.update_status(status)
        self.logger.info(
            "validation_completed",
            validation_code=self.current_validation,
            status=status.value
        )
        self.current_validation = None

    def get_evidence(self, validation_code: str) -> Optional[ValidationEvidence]:
        """Get evidence for a validation code"""
        return self.evidence_chain.get(validation_code)

    def get_chain_status(self) -> Dict[str, Dict]:
        """Get status of entire validation chain"""
        return {
            code: {
                "component": evidence.component.value,
                "type": evidence.type.value,
                "priority": evidence.priority.value,
                "status": evidence.status.value,
                "timestamp": evidence.timestamp,
                "evidence_count": len(evidence.evidence),
                "log_count": len(evidence.logs)
            }
            for code, evidence in self.evidence_chain.items()
        }
