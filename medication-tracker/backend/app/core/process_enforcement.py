"""
Process Enforcement System
Critical Path: VALIDATION-ENF-PROCESS-*
Last Updated: 2025-01-01T22:35:25+01:00
"""

import sys
import os
import logging
from pathlib import Path
from enum import Enum
from typing import Dict, List, Set, Optional, Any
import json
import ast
from datetime import datetime

from ..exceptions import ProcessError

logger = logging.getLogger(__name__)

class ProcessStage(Enum):
    """Stages in the validation and implementation process"""
    PRE_VALIDATION = "pre_validation"
    PLANNING = "planning"
    IMPLEMENTATION = "implementation"
    VALIDATION = "validation"
    EVIDENCE = "evidence"

class ProcessRequirement(Enum):
    """Requirements that must be met before proceeding"""
    VALIDATION_SYSTEM_READY = "validation_system_ready"
    DEPENDENCIES_ANALYZED = "dependencies_analyzed"
    CURRENT_STATE_VALIDATED = "current_state_validated"
    CHANGES_DOCUMENTED = "changes_documented"
    VALIDATION_CHAIN_UPDATED = "validation_chain_updated"
    EVIDENCE_CREATED = "evidence_created"

class ProcessEnforcer:
    """Enforces the validation and implementation process"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.process_state: Dict[ProcessStage, bool] = {
            stage: False for stage in ProcessStage
        }
        self.current_stage = ProcessStage.PRE_VALIDATION
        self.evidence_path = self.project_root / "docs" / "validation" / "evidence"
        
    def validate_system_readiness(self) -> bool:
        """Check if validation system is ready"""
        try:
            # Check validation chain
            chain_file = self.project_root / "docs" / "validation" / "VALIDATION_CHAIN.json"
            if not chain_file.exists():
                raise ProcessError("Validation chain missing")
                
            # Check critical paths
            critical_paths = self.project_root / "docs" / "validation" / "CRITICAL_PATHS.md"
            if not critical_paths.exists():
                raise ProcessError("Critical paths documentation missing")
                
            # Check exception hierarchy
            exceptions_file = self.project_root / "backend" / "app" / "exceptions.py"
            if not exceptions_file.exists():
                raise ProcessError("Exceptions file missing")
                
            return True
        except Exception as e:
            raise ProcessError(f"System readiness check failed: {str(e)}")
            
    def analyze_dependencies(self) -> bool:
        """Analyze dependencies and check for issues"""
        try:
            # Create dependency graph
            dependencies: Dict[str, Set[str]] = {}
            core_path = self.project_root / "backend" / "app" / "core"
            
            for py_file in core_path.glob("*.py"):
                with open(py_file) as f:
                    tree = ast.parse(f.read())
                    
                imports = set()
                for node in ast.walk(tree):
                    if isinstance(node, (ast.Import, ast.ImportFrom)):
                        if isinstance(node, ast.ImportFrom) and node.module:
                            imports.add(node.module)
                        for name in node.names:
                            imports.add(name.name.split('.')[0])
                            
                dependencies[py_file.name] = imports
                
            # Check for circular imports
            def check_circular(module: str, chain: Set[str] = None) -> bool:
                if chain is None:
                    chain = set()
                if module in chain:
                    raise ProcessError(f"Circular import detected: {' -> '.join(chain)} -> {module}")
                chain.add(module)
                for dep in dependencies.get(module, set()):
                    check_circular(dep, chain)
                chain.remove(module)
                return True
                
            for module in dependencies:
                check_circular(module)
                
            return True
        except Exception as e:
            raise ProcessError(f"Dependency analysis failed: {str(e)}")
            
    def validate_current_state(self) -> bool:
        """Validate current state before changes"""
        try:
            # Run existing validation checks
            validation_results = {}
            core_path = self.project_root / "backend" / "app" / "core"
            
            # Check each validation module
            validation_modules = [
                "pre_validation_requirements.py",
                "validation_chain.py",
                "validation_metrics.py",
                "validation_enforcement.py"
            ]
            
            for module in validation_modules:
                module_path = core_path / module
                if not module_path.exists():
                    raise ProcessError(f"Validation module missing: {module}")
                    
                # Check module structure
                with open(module_path) as f:
                    tree = ast.parse(f.read())
                    
                classes = {
                    node.name for node in ast.walk(tree)
                    if isinstance(node, ast.ClassDef)
                }
                
                validation_results[module] = {
                    "exists": True,
                    "classes": classes
                }
                
            return True
        except Exception as e:
            raise ProcessError(f"Current state validation failed: {str(e)}")
            
    def document_changes(self, changes: Dict[str, Any]) -> bool:
        """Document planned changes"""
        try:
            # Create changes documentation
            changes_file = self.evidence_path / "planned_changes.json"
            changes_file.parent.mkdir(parents=True, exist_ok=True)
            
            change_doc = {
                "timestamp": datetime.utcnow().isoformat(),
                "changes": changes,
                "validation_requirements": [req.value for req in ProcessRequirement],
                "affected_modules": list(changes.keys())
            }
            
            with open(changes_file, 'w') as f:
                json.dump(change_doc, f, indent=2)
                
            return True
        except Exception as e:
            raise ProcessError(f"Change documentation failed: {str(e)}")
            
    def update_validation_chain(self) -> bool:
        """Update validation chain with new requirements"""
        try:
            chain_file = self.project_root / "docs" / "validation" / "VALIDATION_CHAIN.json"
            
            with open(chain_file) as f:
                chain = json.load(f)
                
            # Update chain with new validations
            chain["last_updated"] = datetime.utcnow().isoformat()
            
            with open(chain_file, 'w') as f:
                json.dump(chain, f, indent=2)
                
            return True
        except Exception as e:
            raise ProcessError(f"Validation chain update failed: {str(e)}")
            
    def create_validation_evidence(self) -> bool:
        """Create validation evidence for changes"""
        try:
            # Create evidence structure
            evidence = {
                "timestamp": datetime.utcnow().isoformat(),
                "process_state": {
                    stage.value: state
                    for stage, state in self.process_state.items()
                },
                "validation_results": {}
            }
            
            # Save evidence
            evidence_file = self.evidence_path / f"validation_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            evidence_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(evidence_file, 'w') as f:
                json.dump(evidence, f, indent=2)
                
            return True
        except Exception as e:
            raise ProcessError(f"Evidence creation failed: {str(e)}")
            
    def enforce_process(self) -> bool:
        """Enforce the complete validation process"""
        stages = {
            ProcessStage.PRE_VALIDATION: [
                (ProcessRequirement.VALIDATION_SYSTEM_READY, self.validate_system_readiness),
                (ProcessRequirement.DEPENDENCIES_ANALYZED, self.analyze_dependencies),
                (ProcessRequirement.CURRENT_STATE_VALIDATED, self.validate_current_state)
            ],
            ProcessStage.PLANNING: [
                (ProcessRequirement.CHANGES_DOCUMENTED, self.document_changes)
            ],
            ProcessStage.IMPLEMENTATION: [
                (ProcessRequirement.VALIDATION_CHAIN_UPDATED, self.update_validation_chain)
            ],
            ProcessStage.EVIDENCE: [
                (ProcessRequirement.EVIDENCE_CREATED, self.create_validation_evidence)
            ]
        }
        
        print("\n Process Enforcement Check")
        print("=" * 50)
        
        for stage, requirements in stages.items():
            print(f"\n Stage: {stage.value}")
            
            for requirement, check_func in requirements:
                try:
                    print(f" Checking {requirement.value}...")
                    if check_func():
                        print(f" {requirement.value} - Passed")
                        self.process_state[stage] = True
                    else:
                        print(f" {requirement.value} - Failed")
                        return False
                except ProcessError as e:
                    print(f" {requirement.value} - Error: {str(e)}")
                    return False
                    
        print("\n All process checks passed!")
        return True

if __name__ == "__main__":
    enforcer = ProcessEnforcer()
    sys.exit(0 if enforcer.enforce_process() else 1)
