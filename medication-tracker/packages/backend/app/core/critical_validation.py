"""
Critical Path Validation Analyzer
Last Updated: 2024-12-25T23:05:59+01:00
Critical Path: Core.Validation

Specialized validation for critical path components focusing on:
1. Medication Safety
2. Data Security
3. System Reliability
"""

import logging
import ast
from pathlib import Path
from typing import Dict, List, Set, Optional
from dataclasses import dataclass
from datetime import datetime
import re

logger = logging.getLogger(__name__)

@dataclass
class SafetyRule:
    name: str
    pattern: str
    required: bool
    description: str
    validation_func: Optional[callable] = None

@dataclass
class ValidationResult:
    is_valid: bool
    safety_score: float  # 0-1 score
    security_score: float  # 0-1 score
    reliability_score: float  # 0-1 score
    issues: List[str]
    recommendations: List[str]

# Critical safety patterns that must be validated
MEDICATION_SAFETY_RULES = [
    SafetyRule(
        name="dose_validation",
        pattern=r"validate_dosage|check_dose|verify_medication",
        required=True,
        description="Medication dosage must be validated"
    ),
    SafetyRule(
        name="interaction_check",
        pattern=r"check_interactions|verify_compatibility",
        required=True,
        description="Drug interactions must be checked"
    ),
    SafetyRule(
        name="allergy_verification",
        pattern=r"check_allergies|verify_allergies",
        required=True,
        description="Patient allergies must be verified"
    ),
    SafetyRule(
        name="emergency_protocol",
        pattern=r"emergency_protocol|alert_system",
        required=True,
        description="Emergency protocols must be implemented"
    )
]

# Critical security patterns
SECURITY_RULES = [
    SafetyRule(
        name="data_encryption",
        pattern=r"encrypt|decrypt|cipher",
        required=True,
        description="Sensitive data must be encrypted"
    ),
    SafetyRule(
        name="access_control",
        pattern=r"authenticate|authorize|verify_access",
        required=True,
        description="Access control must be implemented"
    ),
    SafetyRule(
        name="audit_logging",
        pattern=r"audit_log|security_log|track_access",
        required=True,
        description="Security events must be logged"
    )
]

# System reliability patterns
RELIABILITY_RULES = [
    SafetyRule(
        name="data_backup",
        pattern=r"backup|save_state|persistent_storage",
        required=True,
        description="Data must be reliably backed up"
    ),
    SafetyRule(
        name="error_handling",
        pattern=r"try|except|handle_error|on_error",
        required=True,
        description="Errors must be properly handled"
    ),
    SafetyRule(
        name="state_validation",
        pattern=r"validate_state|check_consistency|verify_state",
        required=True,
        description="System state must be validated"
    )
]

class CriticalPathValidator:
    def __init__(self):
        self.safety_rules = MEDICATION_SAFETY_RULES
        self.security_rules = SECURITY_RULES
        self.reliability_rules = RELIABILITY_RULES
        
    def validate_file(self, file_path: str) -> ValidationResult:
        """Validate a file for critical path compliance"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Initialize scores
            safety_score = 0
            security_score = 0
            reliability_score = 0
            issues = []
            recommendations = []
            
            # Check safety rules
            safety_score, safety_issues = self._check_rules(
                content, 
                self.safety_rules,
                "Safety"
            )
            issues.extend(safety_issues)
            
            # Check security rules
            security_score, security_issues = self._check_rules(
                content,
                self.security_rules,
                "Security"
            )
            issues.extend(security_issues)
            
            # Check reliability rules
            reliability_score, reliability_issues = self._check_rules(
                content,
                self.reliability_rules,
                "Reliability"
            )
            issues.extend(reliability_issues)
            
            # Generate recommendations
            if issues:
                recommendations = self._generate_recommendations(issues)
            
            # Calculate overall validity
            is_valid = (
                safety_score >= 0.8 and
                security_score >= 0.8 and
                reliability_score >= 0.8 and
                not any(r.required for r in self.safety_rules if not re.search(r.pattern, content))
            )
            
            return ValidationResult(
                is_valid=is_valid,
                safety_score=safety_score,
                security_score=security_score,
                reliability_score=reliability_score,
                issues=issues,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error validating {file_path}: {str(e)}")
            return ValidationResult(
                is_valid=False,
                safety_score=0,
                security_score=0,
                reliability_score=0,
                issues=[f"Validation error: {str(e)}"],
                recommendations=["Fix validation errors before proceeding"]
            )
    
    def _check_rules(
        self,
        content: str,
        rules: List[SafetyRule],
        category: str
    ) -> tuple[float, List[str]]:
        """Check content against a set of rules"""
        issues = []
        matched_rules = 0
        
        for rule in rules:
            if not re.search(rule.pattern, content):
                if rule.required:
                    issues.append(f"❌ Required {category}: {rule.description}")
                else:
                    issues.append(f"⚠️ Recommended {category}: {rule.description}")
            else:
                matched_rules += 1
                
        score = matched_rules / len(rules) if rules else 1.0
        return score, issues
    
    def _generate_recommendations(self, issues: List[str]) -> List[str]:
        """Generate recommendations based on issues"""
        recommendations = []
        
        # Group issues by category
        safety_issues = [i for i in issues if "Safety" in i]
        security_issues = [i for i in issues if "Security" in i]
        reliability_issues = [i for i in issues if "Reliability" in i]
        
        # Generate specific recommendations
        if safety_issues:
            recommendations.append(
                "🔴 Critical: Implement required medication safety checks"
            )
            
        if security_issues:
            recommendations.append(
                "🔴 Critical: Add required security measures"
            )
            
        if reliability_issues:
            recommendations.append(
                "🔴 Critical: Implement reliability safeguards"
            )
            
        return recommendations
    
    def validate_critical_component(self, component_path: str) -> Dict:
        """Validate an entire critical component"""
        results = {
            'component': component_path,
            'timestamp': datetime.now().isoformat(),
            'files_checked': 0,
            'files_valid': 0,
            'overall_safety_score': 0,
            'overall_security_score': 0,
            'overall_reliability_score': 0,
            'critical_issues': [],
            'recommendations': set()
        }
        
        # Validate all Python files in component
        for file_path in Path(component_path).rglob('*.py'):
            results['files_checked'] += 1
            
            validation = self.validate_file(str(file_path))
            if validation.is_valid:
                results['files_valid'] += 1
                
            results['overall_safety_score'] += validation.safety_score
            results['overall_security_score'] += validation.security_score
            results['overall_reliability_score'] += validation.reliability_score
            
            if not validation.is_valid:
                results['critical_issues'].extend(validation.issues)
                results['recommendations'].update(validation.recommendations)
        
        # Calculate averages
        if results['files_checked'] > 0:
            results['overall_safety_score'] /= results['files_checked']
            results['overall_security_score'] /= results['files_checked']
            results['overall_reliability_score'] /= results['files_checked']
        
        return results

# Global validator instance
_validator = CriticalPathValidator()

def get_validator() -> CriticalPathValidator:
    """Get the global validator instance"""
    return _validator
