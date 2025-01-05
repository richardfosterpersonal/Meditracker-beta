"""
Validation Chain Synchronization
Critical Path: VALIDATION-CHAIN-SYNC
Last Updated: 2025-01-02T13:33:03+01:00

Ensures ALL components follow unified validation approach through validation chain.
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import json
import re
import ast
from typing import Dict, List, Set, Optional
from dataclasses import dataclass

@dataclass
class ValidationEvidence:
    """Evidence of validation compliance"""
    component_id: str
    timestamp: str
    critical_path: str
    validation_layer: str
    source_file: str
    is_compliant: bool
    issues: List[str]

class ValidationChainSync:
    """Synchronizes and enforces the entire validation chain"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.docs_dir = self.project_root / "docs"
        self.validation_dir = self.docs_dir / "validation"
        self.evidence_dir = self.validation_dir / "evidence"
        self.critical_paths = {
            "master": self.docs_dir / "MASTER_CRITICAL_PATH.md",
            "beta": self.docs_dir / "BETA_CRITICAL_PATH.md",
            "validation": self.docs_dir / "VALIDATION_DOCUMENTATION.md",
            "alignment": self.docs_dir / "MASTER_ALIGNMENT.md",
            "unified": self.docs_dir / "UNIFIED_SOURCE_OF_TRUTH.md"
        }
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.timestamp_pattern = re.compile(r"Last Updated: (.*)")
        
        # Ensure evidence directory exists
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
    def update_document_timestamp(self, file_path: Path) -> None:
        """Updates the timestamp in a markdown document"""
        if not file_path.exists():
            return
            
        content = file_path.read_text()
        updated_content = re.sub(
            r"Last Updated: .*",
            f"Last Updated: {self.timestamp}",
            content
        )
        file_path.write_text(updated_content)
        
    def sync_critical_paths(self) -> None:
        """Synchronizes all critical path documents"""
        for doc in self.critical_paths.values():
            self.update_document_timestamp(doc)
            
    def validate_references(self) -> List[str]:
        """Validates all document references"""
        errors = []
        for doc in self.critical_paths.values():
            if not doc.exists():
                errors.append(f"Missing critical path document: {doc}")
                continue
                
            content = doc.read_text()
            
            # Check for required sections
            if "Critical Path:" not in content:
                errors.append(f"Missing Critical Path section in {doc}")
            if "Last Updated:" not in content:
                errors.append(f"Missing Last Updated timestamp in {doc}")
                
        return errors
        
    def collect_validation_evidence(self) -> List[ValidationEvidence]:
        """Collects validation evidence from all components"""
        evidence_list = []
        
        for py_file in self.project_root.rglob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, (ast.ClassDef, ast.FunctionDef)):
                        evidence = self._validate_component(node, py_file)
                        if evidence:
                            evidence_list.append(evidence)
                            
            except Exception as e:
                print(f"Error processing {py_file}: {str(e)}")
                
        return evidence_list
        
    def _validate_component(self, node: ast.AST, file_path: Path) -> Optional[ValidationEvidence]:
        """Validates a single component"""
        issues = []
        
        # Check for unified validation decorator
        has_decorator = False
        critical_path = "UNKNOWN"
        validation_layer = "UNKNOWN"
        
        for decorator in getattr(node, 'decorator_list', []):
            if 'unified_validation' in ast.unparse(decorator):
                has_decorator = True
                decorator_str = ast.unparse(decorator)
                if 'critical_path=' in decorator_str:
                    critical_path = decorator_str.split('critical_path=')[1].split(',')[0].strip('"\'')
                if 'validation_layer=' in decorator_str:
                    validation_layer = decorator_str.split('validation_layer=')[1].split(',')[0].strip('"\'')
                    
        if not has_decorator:
            issues.append("Missing @unified_validation decorator")
            
        # Check for evidence collection
        source = ast.unparse(node)
        if 'validate_critical_path' not in source:
            issues.append("Missing evidence collection")
            
        return ValidationEvidence(
            component_id=f"{file_path}:{node.name}",
            timestamp=self.timestamp,
            critical_path=critical_path,
            validation_layer=validation_layer,
            source_file=str(file_path),
            is_compliant=len(issues) == 0,
            issues=issues
        )
        
    def store_evidence(self, evidence_list: List[ValidationEvidence]) -> None:
        """Stores validation evidence"""
        evidence_file = self.evidence_dir / f"validation_evidence_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        
        evidence_data = {
            "timestamp": self.timestamp,
            "total_components": len(evidence_list),
            "compliant_components": len([e for e in evidence_list if e.is_compliant]),
            "evidence": [vars(e) for e in evidence_list]
        }
        
        with open(evidence_file, 'w') as f:
            json.dump(evidence_data, f, indent=2)
            
    def enforce_validation(self) -> bool:
        """Enforces validation chain integrity"""
        print("Enforcing validation chain...")
        
        # Step 1: Sync critical paths
        print("Syncing critical paths...")
        self.sync_critical_paths()
        
        # Step 2: Validate references
        print("Validating references...")
        reference_errors = self.validate_references()
        if reference_errors:
            print("\nReference validation failed:")
            for error in reference_errors:
                print(f"- {error}")
            return False
            
        # Step 3: Collect and validate evidence
        print("Collecting validation evidence...")
        evidence_list = self.collect_validation_evidence()
        
        # Step 4: Store evidence
        print("Storing validation evidence...")
        self.store_evidence(evidence_list)
        
        # Step 5: Check compliance
        non_compliant = [e for e in evidence_list if not e.is_compliant]
        if non_compliant:
            print("\nValidation compliance failed:")
            for evidence in non_compliant:
                print(f"\n{evidence.component_id}:")
                for issue in evidence.issues:
                    print(f"- {issue}")
            return False
            
        print("\nValidation chain enforcement successful!")
        return True

def main():
    """Main entry point"""
    sync = ValidationChainSync()
    if not sync.enforce_validation():
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
