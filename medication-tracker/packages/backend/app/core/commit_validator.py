"""
Commit Message Validator
Critical Path: COMMIT-VAL-*
Last Updated: 2025-01-01T23:17:20+01:00

Enforces structured commit messages that document proactive analysis and root cause.
"""

import re
from enum import Enum
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ValidationPattern:
    """Pattern to validate in commit messages"""
    pattern: str
    description: str
    required: bool
    error_msg: str

class CommitType(Enum):
    """Types of commits with required documentation"""
    ANALYSIS = "analysis"  # For proactive analysis commits
    FIX = "fix"           # For bug fixes (requires root cause)
    FEATURE = "feat"      # For new features (requires validation)
    REFACTOR = "refactor" # For code improvements
    TEST = "test"         # For test additions/modifications
    DOCS = "docs"         # For documentation updates
    PERF = "perf"        # For performance improvements
    SECURITY = "security" # For security-related changes
    MONITOR = "monitor"   # For monitoring/observability changes

class CommitSection(Enum):
    """Required sections in commit messages"""
    ANALYSIS = "Analysis"
    ROOT_CAUSE = "Root Cause"
    VALIDATION = "Validation"
    IMPACT = "Impact"
    TESTING = "Testing"
    ALTERNATIVES = "Alternatives Considered"
    MONITORING = "Monitoring"
    ROLLBACK = "Rollback Plan"
    DEPENDENCIES = "Dependencies"

class CommitValidator:
    """Validates commit messages for guideline compliance"""
    
    def __init__(self):
        self.type_patterns = {
            CommitType.ANALYSIS: r"^analysis(\(.+\))?: .+",
            CommitType.FIX: r"^fix(\(.+\))?: .+",
            CommitType.FEATURE: r"^feat(\(.+\))?: .+",
            CommitType.REFACTOR: r"^refactor(\(.+\))?: .+",
            CommitType.TEST: r"^test(\(.+\))?: .+",
            CommitType.DOCS: r"^docs(\(.+\))?: .+",
            CommitType.PERF: r"^perf(\(.+\))?: .+",
            CommitType.SECURITY: r"^security(\(.+\))?: .+",
            CommitType.MONITOR: r"^monitor(\(.+\))?: .+"
        }
        
        self.required_sections = {
            CommitType.ANALYSIS: [
                CommitSection.ANALYSIS,
                CommitSection.IMPACT,
                CommitSection.MONITORING
            ],
            CommitType.FIX: [
                CommitSection.ROOT_CAUSE,
                CommitSection.ANALYSIS,
                CommitSection.TESTING,
                CommitSection.ROLLBACK
            ],
            CommitType.FEATURE: [
                CommitSection.VALIDATION,
                CommitSection.TESTING,
                CommitSection.IMPACT,
                CommitSection.ALTERNATIVES,
                CommitSection.DEPENDENCIES
            ],
            CommitType.REFACTOR: [
                CommitSection.ANALYSIS,
                CommitSection.IMPACT,
                CommitSection.TESTING,
                CommitSection.ROLLBACK
            ],
            CommitType.PERF: [
                CommitSection.ANALYSIS,
                CommitSection.IMPACT,
                CommitSection.TESTING,
                CommitSection.MONITORING
            ],
            CommitType.SECURITY: [
                CommitSection.ANALYSIS,
                CommitSection.IMPACT,
                CommitSection.TESTING,
                CommitSection.ROLLBACK,
                CommitSection.MONITORING
            ],
            CommitType.MONITOR: [
                CommitSection.ANALYSIS,
                CommitSection.IMPACT,
                CommitSection.MONITORING
            ]
        }
        
        # Define validation patterns for each section
        self.section_patterns = {
            CommitSection.ROOT_CAUSE: [
                ValidationPattern(
                    r"because|due to|caused by|result of|stems from",
                    "Causal explanation",
                    True,
                    "Root cause must explain the cause with 'because', 'due to', etc."
                ),
                ValidationPattern(
                    r"impact.*includes|affects|changes|modifies",
                    "Impact description",
                    True,
                    "Root cause must describe the impact"
                ),
                ValidationPattern(
                    r"discovered|found|identified|detected",
                    "Discovery process",
                    True,
                    "Root cause must explain how it was discovered"
                )
            ],
            CommitSection.ANALYSIS: [
                ValidationPattern(
                    r"analyzed|investigated|examined|studied|profiled",
                    "Analysis process",
                    True,
                    "Analysis must describe the investigation process"
                ),
                ValidationPattern(
                    r"data shows|metrics indicate|logs reveal|testing confirms",
                    "Evidence reference",
                    True,
                    "Analysis must reference supporting evidence"
                ),
                ValidationPattern(
                    r"considered|evaluated|compared|measured",
                    "Evaluation process",
                    True,
                    "Analysis must show evaluation of options"
                )
            ],
            CommitSection.VALIDATION: [
                ValidationPattern(
                    r"tested|verified|validated|confirmed",
                    "Validation method",
                    True,
                    "Validation must describe testing approach"
                ),
                ValidationPattern(
                    r"coverage|scenarios|edge cases|test cases",
                    "Test coverage",
                    True,
                    "Validation must specify test coverage"
                ),
                ValidationPattern(
                    r"results show|proves|demonstrates|confirms",
                    "Results confirmation",
                    True,
                    "Validation must confirm results"
                )
            ],
            CommitSection.IMPACT: [
                ValidationPattern(
                    r"affects|impacts|changes|modifies",
                    "Impact scope",
                    True,
                    "Impact must describe scope of changes"
                ),
                ValidationPattern(
                    r"performance|reliability|security|usability",
                    "Impact areas",
                    True,
                    "Impact must specify affected areas"
                ),
                ValidationPattern(
                    r"before|after|improved|reduced|increased",
                    "Comparative analysis",
                    True,
                    "Impact must provide comparative analysis"
                )
            ],
            CommitSection.MONITORING: [
                ValidationPattern(
                    r"metrics|alerts|logs|traces",
                    "Monitoring methods",
                    True,
                    "Monitoring must specify methods"
                ),
                ValidationPattern(
                    r"threshold|baseline|expected|normal",
                    "Monitoring baselines",
                    True,
                    "Monitoring must define baselines"
                )
            ],
            CommitSection.ROLLBACK: [
                ValidationPattern(
                    r"revert|restore|rollback|undo",
                    "Rollback method",
                    True,
                    "Rollback must specify reversion method"
                ),
                ValidationPattern(
                    r"steps|process|procedure|plan",
                    "Rollback steps",
                    True,
                    "Rollback must outline specific steps"
                )
            ],
            CommitSection.ALTERNATIVES: [
                ValidationPattern(
                    r"alternative|option|approach|solution",
                    "Alternative options",
                    True,
                    "Must list alternative approaches"
                ),
                ValidationPattern(
                    r"pros|cons|advantages|disadvantages|tradeoffs",
                    "Trade-off analysis",
                    True,
                    "Must analyze trade-offs"
                ),
                ValidationPattern(
                    r"selected|chose|preferred|decided",
                    "Decision rationale",
                    True,
                    "Must explain decision rationale"
                )
            ]
        }
        
    def validate_section_content(self, section: CommitSection, content: str) -> List[str]:
        """Validate section content against patterns"""
        errors = []
        if section in self.section_patterns:
            for pattern in self.section_patterns[section]:
                if pattern.required and not re.search(pattern.pattern, content, re.IGNORECASE):
                    errors.append(pattern.error_msg)
        return errors
        
    def parse_commit_type(self, message: str) -> Optional[CommitType]:
        """Parse commit type from message"""
        first_line = message.split('\n')[0].strip()
        for commit_type, pattern in self.type_patterns.items():
            if re.match(pattern, first_line):
                return commit_type
        return None
        
    def get_sections(self, message: str) -> Dict[CommitSection, str]:
        """Extract sections from commit message"""
        sections = {}
        current_section = None
        current_content = []
        
        for line in message.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Check for section headers
            for section in CommitSection:
                if line.startswith(f"{section.value}:"):
                    if current_section:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = section
                    current_content = []
                    break
            else:
                if current_section:
                    current_content.append(line)
                    
        # Add last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
            
        return sections
        
    def validate_commit_message(self, message: str) -> Dict[str, any]:
        """
        Validate commit message against guidelines
        
        Args:
            message: Git commit message
            
        Returns:
            Dict containing validation results
        """
        results = {
            "valid": False,
            "errors": [],
            "warnings": []
        }
        
        # Check commit type
        commit_type = self.parse_commit_type(message)
        if not commit_type:
            results["errors"].append(
                f"Invalid commit type. Must start with one of: {', '.join(t.value for t in CommitType)}"
            )
            return results
            
        # Get message sections
        sections = self.get_sections(message)
        
        # Check required sections
        if commit_type in self.required_sections:
            for required_section in self.required_sections[commit_type]:
                if required_section not in sections:
                    results["errors"].append(
                        f"Missing required section for {commit_type.value}: {required_section.value}"
                    )
                    
        # Validate section content
        for section, content in sections.items():
            # Check content length
            if len(content.split()) < 10:
                results["warnings"].append(
                    f"Section {section.value} seems too brief (< 10 words). Add more details."
                )
                
            # Check for specific patterns
            errors = self.validate_section_content(section, content)
            results["errors"].extend(errors)
                    
        results["valid"] = len(results["errors"]) == 0
        return results
        
    def format_commit_template(self, commit_type: CommitType) -> str:
        """Generate commit message template"""
        template = [f"{commit_type.value}: Brief description\n"]
        
        if commit_type in self.required_sections:
            for section in self.required_sections[commit_type]:
                template.append(f"{section.value}:")
                if section in self.section_patterns:
                    patterns = self.section_patterns[section]
                    template.append("Required elements:")
                    for pattern in patterns:
                        if pattern.required:
                            template.append(f"- {pattern.description}")
                template.append("")
                
        return '\n'.join(template)
