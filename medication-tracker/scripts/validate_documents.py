"""
Document Validation Script
Last Updated: 2024-12-25T11:45:45+01:00
Reference: VALIDATION_HOOK_SYSTEM.md
Parent: MASTER_CRITICAL_PATH.md
"""

import sys
from pathlib import Path
from typing import List, Set
import re
import json
from dataclasses import dataclass

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]
    warnings: List[str]

class DocumentValidator:
    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.master_doc = "docs/validation/MASTER_CRITICAL_PATH.md"
        self.required_references = {
            self.master_doc,
            "docs/validation/VALIDATION_HOOK_SYSTEM.md",
            "docs/validation/DOCUMENT_HIERARCHY.md"
        }
        self.cache_file = self.root_dir / ".validation_cache.json"
        self.validation_cache = self._load_cache()

    def validate_all(self) -> ValidationResult:
        """Validate all documents in the repository"""
        errors = []
        warnings = []
        
        # Get all tracked files
        files = self._get_tracked_files()
        
        # Validate each file
        for file in files:
            if self._should_validate(file):
                result = self._validate_file(file)
                errors.extend(result.errors)
                warnings.extend(result.warnings)
        
        # Update cache
        self._save_cache()
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _validate_file(self, file: Path) -> ValidationResult:
        """Validate a single file"""
        errors = []
        warnings = []
        
        # Skip if unchanged
        if not self._has_changed(file):
            return ValidationResult(True, [], [])
        
        content = file.read_text()
        
        # Check required references
        if self._needs_references(file):
            missing_refs = self._check_references(content)
            if missing_refs:
                errors.append(f"{file}: Missing required references: {missing_refs}")
        
        # Check circular references
        if self._has_circular_reference(file, content):
            errors.append(f"{file}: Contains circular references")
        
        # Check hierarchy compliance
        if not self._check_hierarchy(file, content):
            errors.append(f"{file}: Violates document hierarchy")
        
        # Update cache
        self._update_cache(file, content)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _get_tracked_files(self) -> Set[Path]:
        """Get all git tracked files"""
        import subprocess
        result = subprocess.run(
            ['git', 'ls-files'],
            capture_output=True,
            text=True
        )
        return {self.root_dir / file for file in result.stdout.splitlines()}

    def _should_validate(self, file: Path) -> bool:
        """Check if file should be validated"""
        return (
            file.suffix in {'.md', '.py', '.js', '.ts', '.jsx', '.tsx'} and
            'node_modules' not in str(file) and
            'venv' not in str(file)
        )

    def _has_changed(self, file: Path) -> bool:
        """Check if file has changed since last validation"""
        if str(file) not in self.validation_cache:
            return True
        
        return self.validation_cache[str(file)]['hash'] != self._hash_content(file.read_text())

    def _check_references(self, content: str) -> Set[str]:
        """Check for required references"""
        found_refs = set()
        for line in content.split('\n'):
            if 'Reference:' in line:
                ref = line.split('Reference:')[1].strip()
                found_refs.add(ref)
            if 'Parent:' in line:
                ref = line.split('Parent:')[1].strip()
                found_refs.add(ref)
        
        return self.required_references - found_refs

    def _has_circular_reference(self, file: Path, content: str) -> bool:
        """Check for circular references"""
        def check_circular(current: str, chain: Set[str]) -> bool:
            if current in chain:
                return True
            
            current_content = Path(current).read_text()
            refs = self._extract_references(current_content)
            
            for ref in refs:
                if check_circular(ref, chain | {current}):
                    return True
            
            return False
        
        return check_circular(str(file), set())

    def _check_hierarchy(self, file: Path, content: str) -> bool:
        """Check document hierarchy compliance"""
        level = self._get_doc_level(file)
        refs = self._extract_references(content)
        
        for ref in refs:
            ref_level = self._get_doc_level(Path(ref))
            if ref_level > level:
                return False
        
        return True

    def _get_doc_level(self, file: Path) -> int:
        """Get document hierarchy level"""
        if str(file) == self.master_doc:
            return 0
        
        # Check parent references
        content = file.read_text()
        if 'Parent: MASTER_CRITICAL_PATH.md' in content:
            return 1
        
        return 2

    def _extract_references(self, content: str) -> Set[str]:
        """Extract all references from content"""
        refs = set()
        for line in content.split('\n'):
            if 'Reference:' in line:
                ref = line.split('Reference:')[1].strip()
                refs.add(ref)
            if 'Parent:' in line:
                ref = line.split('Parent:')[1].strip()
                refs.add(ref)
        return refs

    def _hash_content(self, content: str) -> str:
        """Create hash of content"""
        import hashlib
        return hashlib.md5(content.encode()).hexdigest()

    def _load_cache(self) -> dict:
        """Load validation cache"""
        if self.cache_file.exists():
            return json.loads(self.cache_file.read_text())
        return {}

    def _save_cache(self) -> None:
        """Save validation cache"""
        self.cache_file.write_text(json.dumps(self.validation_cache))

    def _update_cache(self, file: Path, content: str) -> None:
        """Update cache for file"""
        self.validation_cache[str(file)] = {
            'hash': self._hash_content(content),
            'last_validated': str(Path(__file__).stat().st_mtime)
        }

def main():
    validator = DocumentValidator()
    result = validator.validate_all()
    
    if result.warnings:
        print("\nWarnings:")
        for warning in result.warnings:
            print(f"- {warning}")
    
    if result.errors:
        print("\nErrors:")
        for error in result.errors:
            print(f"- {error}")
        sys.exit(1)
    
    print("Document validation successful!")
    sys.exit(0)

if __name__ == "__main__":
    main()
