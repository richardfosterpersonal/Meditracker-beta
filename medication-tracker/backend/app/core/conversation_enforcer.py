"""
Conversation Guidelines Enforcer
Critical Path: CONV-ENF-*
Last Updated: 2025-01-01T23:03:31+01:00

Enforces conversation guidelines and proactive behavior in code and documentation.
"""

import ast
import inspect
from pathlib import Path
from typing import Dict, Any, List, Set
import logging
from enum import Enum, auto
from dataclasses import dataclass
from datetime import datetime

from ..exceptions import ValidationHookError

logger = logging.getLogger(__name__)

class ConversationGuideline(Enum):
    """Core conversation guidelines that must be followed"""
    PROACTIVE_ANALYSIS = auto()
    ROOT_CAUSE_FIRST = auto()
    SYSTEMATIC_APPROACH = auto()
    CLEAR_COMMUNICATION = auto()
    ACTION_ORIENTED = auto()

@dataclass
class GuidelineEvidence:
    """Evidence of guideline compliance"""
    guideline: ConversationGuideline
    file_path: str
    line_number: int
    evidence: str
    timestamp: str

class ConversationEnforcer:
    """Enforces conversation guidelines in code and documentation"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.evidence_store: List[GuidelineEvidence] = []
        
    def analyze_file_content(self, file_path: Path) -> Dict[ConversationGuideline, List[str]]:
        """Analyze file content for guideline compliance"""
        try:
            with open(file_path, encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
            evidence = {guideline: [] for guideline in ConversationGuideline}
            
            class GuidelineVisitor(ast.NodeVisitor):
                def visit_FunctionDef(self, node):
                    # Check for proactive analysis
                    if any(ast.get_docstring(node) or '').lower().startswith(('analyze', 'validate', 'check')):
                        evidence[ConversationGuideline.PROACTIVE_ANALYSIS].append(
                            f"Function {node.name} implements proactive analysis"
                        )
                        
                    # Check for systematic approach
                    if len(node.body) > 1 and isinstance(node.body[0], ast.Try):
                        evidence[ConversationGuideline.SYSTEMATIC_APPROACH].append(
                            f"Function {node.name} uses systematic error handling"
                        )
                        
                    self.generic_visit(node)
                    
                def visit_Try(self, node):
                    # Check for root cause analysis
                    for handler in node.handlers:
                        if any('root cause' in ast.get_docstring(stmt) or '' 
                              for stmt in handler.body if isinstance(stmt, ast.Expr)):
                            evidence[ConversationGuideline.ROOT_CAUSE_FIRST].append(
                                "Exception handler includes root cause analysis"
                            )
                    self.generic_visit(node)
                    
                def visit_ClassDef(self, node):
                    # Check for clear communication
                    if ast.get_docstring(node):
                        evidence[ConversationGuideline.CLEAR_COMMUNICATION].append(
                            f"Class {node.name} has clear documentation"
                        )
                    self.generic_visit(node)
                    
                def visit_Call(self, node):
                    # Check for action-oriented code
                    if isinstance(node.func, ast.Name):
                        if node.func.id.startswith(('fix', 'resolve', 'implement')):
                            evidence[ConversationGuideline.ACTION_ORIENTED].append(
                                f"Action-oriented call to {node.func.id}"
                            )
                    self.generic_visit(node)
                    
            visitor = GuidelineVisitor()
            visitor.visit(tree)
            return evidence
            
        except Exception as e:
            logger.error(f"Failed to analyze {file_path}: {str(e)}")
            return {guideline: [] for guideline in ConversationGuideline}
            
    def record_evidence(self, guideline: ConversationGuideline, file_path: str, 
                       line_number: int, evidence: str) -> None:
        """Record evidence of guideline compliance"""
        self.evidence_store.append(GuidelineEvidence(
            guideline=guideline,
            file_path=file_path,
            line_number=line_number,
            evidence=evidence,
            timestamp=datetime.utcnow().isoformat()
        ))
        
    def validate_guidelines(self) -> Dict[str, Any]:
        """Validate conversation guidelines across the codebase"""
        try:
            results = {
                "files_analyzed": 0,
                "guideline_compliance": {},
                "recommendations": []
            }
            
            # Analyze Python files
            for py_file in self.project_root.rglob("*.py"):
                results["files_analyzed"] += 1
                evidence = self.analyze_file_content(py_file)
                
                # Record evidence
                for guideline, items in evidence.items():
                    for item in items:
                        self.record_evidence(
                            guideline,
                            str(py_file),
                            0,  # Line number would be more specific in real implementation
                            item
                        )
                        
                    if guideline not in results["guideline_compliance"]:
                        results["guideline_compliance"][guideline] = {
                            "evidence_count": 0,
                            "compliant_files": set()
                        }
                        
                    if items:
                        results["guideline_compliance"][guideline]["evidence_count"] += len(items)
                        results["guideline_compliance"][guideline]["compliant_files"].add(str(py_file))
                        
            # Generate recommendations
            for guideline in ConversationGuideline:
                compliance = results["guideline_compliance"].get(guideline, {})
                if not compliance or compliance.get("evidence_count", 0) < results["files_analyzed"]:
                    results["recommendations"].append({
                        "guideline": guideline.name,
                        "recommendation": f"Improve {guideline.name.lower().replace('_', ' ')} coverage"
                    })
                    
            # Convert sets to lists for JSON serialization
            for guideline in results["guideline_compliance"]:
                results["guideline_compliance"][guideline]["compliant_files"] = list(
                    results["guideline_compliance"][guideline]["compliant_files"]
                )
                
            return {
                "valid": len(results["recommendations"]) == 0,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Guideline validation failed: {str(e)}")
            raise ValidationHookError(f"Guideline validation failed: {str(e)}")

def enforce_guidelines(func):
    """Decorator to enforce conversation guidelines"""
    def wrapper(*args, **kwargs):
        # Get function metadata
        source = inspect.getsource(func)
        tree = ast.parse(source)
        
        # Check for guideline compliance
        has_proactive_analysis = False
        has_systematic_approach = False
        has_root_cause = False
        
        class GuidelineChecker(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                nonlocal has_proactive_analysis, has_systematic_approach, has_root_cause
                
                # Check docstring for proactive analysis
                docstring = ast.get_docstring(node)
                if docstring and any(word in docstring.lower() 
                                   for word in ['analyze', 'validate', 'check']):
                    has_proactive_analysis = True
                    
                # Check for systematic approach
                if len(node.body) > 1 and isinstance(node.body[0], ast.Try):
                    has_systematic_approach = True
                    
                # Check for root cause analysis
                if docstring and 'root cause' in docstring.lower():
                    has_root_cause = True
                    
                self.generic_visit(node)
                
        checker = GuidelineChecker()
        checker.visit(tree)
        
        # Log compliance status
        logger.info(
            f"Guideline compliance for {func.__name__}:",
            extra={
                "proactive_analysis": has_proactive_analysis,
                "systematic_approach": has_systematic_approach,
                "root_cause_analysis": has_root_cause
            }
        )
        
        return func(*args, **kwargs)
        
    return wrapper
