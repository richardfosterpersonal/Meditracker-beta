"""
Debug Validation System
Critical Path: DEBUG-VAL-*
Last Updated: 2025-01-01T23:00:44+01:00

This module enforces proactive debugging practices and root cause analysis.
"""

import ast
import inspect
from pathlib import Path
from typing import Dict, Any, List, Set
import logging

from ..exceptions import ValidationHookError

logger = logging.getLogger(__name__)

class DebugValidationError(ValidationHookError):
    """Raised when debug validation fails"""
    pass

class DebugValidator:
    """Validates and enforces debugging practices"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.core_path = project_root / "backend" / "app" / "core"
        
    def analyze_error_handling(self, file_path: Path) -> Dict[str, Any]:
        """Analyze error handling practices in a file"""
        try:
            with open(file_path, encoding='utf-8') as f:
                tree = ast.parse(f.read())
                
            class ErrorAnalyzer(ast.NodeVisitor):
                def __init__(self):
                    self.error_patterns = {
                        "bare_except": 0,
                        "logged_errors": 0,
                        "error_details": 0,
                        "root_cause_comments": 0
                    }
                    
                def visit_Try(self, node):
                    for handler in node.handlers:
                        # Check for bare except
                        if handler.type is None:
                            self.error_patterns["bare_except"] += 1
                            
                        # Check for logging in except blocks
                        for stmt in handler.body:
                            if isinstance(stmt, ast.Call):
                                if isinstance(stmt.func, ast.Attribute):
                                    if "log" in stmt.func.attr:
                                        self.error_patterns["logged_errors"] += 1
                                        
                        # Check for error details capture
                        for stmt in handler.body:
                            if isinstance(stmt, ast.Call):
                                if isinstance(stmt.func, ast.Name):
                                    if stmt.func.id == "str":
                                        self.error_patterns["error_details"] += 1
                                        
                    self.generic_visit(node)
                    
                def visit_Str(self, node):
                    # Check for root cause analysis comments
                    if "root cause" in node.s.lower():
                        self.error_patterns["root_cause_comments"] += 1
                    self.generic_visit(node)
                    
            analyzer = ErrorAnalyzer()
            analyzer.visit(tree)
            return analyzer.error_patterns
            
        except Exception as e:
            logger.error(f"Failed to analyze error handling in {file_path}: {str(e)}")
            return {}
            
    def validate_debug_practices(self) -> Dict[str, Any]:
        """Validate debugging practices across the codebase"""
        try:
            results = {
                "files_analyzed": 0,
                "issues_found": [],
                "recommendations": []
            }
            
            # Analyze Python files in core directory
            for py_file in self.core_path.glob("**/*.py"):
                results["files_analyzed"] += 1
                error_patterns = self.analyze_error_handling(py_file)
                
                # Check for issues
                if error_patterns.get("bare_except", 0) > 0:
                    results["issues_found"].append({
                        "file": str(py_file),
                        "issue": "Bare except found",
                        "count": error_patterns["bare_except"]
                    })
                    results["recommendations"].append(
                        "Replace bare except with specific exception types"
                    )
                    
                if error_patterns.get("logged_errors", 0) == 0:
                    results["issues_found"].append({
                        "file": str(py_file),
                        "issue": "No error logging found",
                        "details": "Add logging statements in error handlers"
                    })
                    results["recommendations"].append(
                        "Add comprehensive error logging"
                    )
                    
                if error_patterns.get("error_details", 0) == 0:
                    results["issues_found"].append({
                        "file": str(py_file),
                        "issue": "No error details captured",
                        "details": "Add error detail capture in handlers"
                    })
                    results["recommendations"].append(
                        "Capture and log detailed error information"
                    )
                    
                if error_patterns.get("root_cause_comments", 0) == 0:
                    results["issues_found"].append({
                        "file": str(py_file),
                        "issue": "No root cause analysis comments",
                        "details": "Add comments explaining error scenarios"
                    })
                    results["recommendations"].append(
                        "Document root cause analysis in comments"
                    )
                    
            return {
                "valid": len(results["issues_found"]) == 0,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Debug validation failed: {str(e)}")
            raise DebugValidationError(f"Debug validation failed: {str(e)}")
            
class DebugEnforcer:
    """Enforces proactive debugging practices"""
    
    @staticmethod
    def validate_error_handling(func):
        """Decorator to validate error handling in functions"""
        def wrapper(*args, **kwargs):
            # Get function source
            source = inspect.getsource(func)
            tree = ast.parse(source)
            
            # Check for try-except blocks
            has_error_handling = False
            for node in ast.walk(tree):
                if isinstance(node, ast.Try):
                    has_error_handling = True
                    break
                    
            if not has_error_handling:
                logger.warning(
                    f"Function {func.__name__} lacks error handling"
                )
                
            return func(*args, **kwargs)
        return wrapper
        
    @staticmethod
    def enforce_root_cause_analysis(func):
        """Decorator to enforce root cause analysis"""
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Get traceback and context
                tb = inspect.trace()
                context = {
                    "function": func.__name__,
                    "module": func.__module__,
                    "args": args,
                    "kwargs": kwargs,
                    "locals": {
                        frame.frame.f_code.co_name: frame.frame.f_locals
                        for frame in tb
                    }
                }
                
                logger.error(
                    f"Root cause analysis for {func.__name__}: {str(e)}",
                    extra={"context": context}
                )
                raise
        return wrapper
