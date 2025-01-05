"""
Runtime Conversation Enforcer
Critical Path: CONV-ENF-RT-*
Last Updated: 2025-01-01T23:08:41+01:00

Enforces conversation guidelines at runtime through decorators and context managers.
"""

import functools
import inspect
import logging
import ast
from contextlib import contextmanager
from typing import Optional, Callable, Dict, Any
from pathlib import Path

from .conversation_enforcer import ConversationGuideline, ConversationEnforcer
from ..exceptions import ValidationHookError

logger = logging.getLogger(__name__)

class RuntimeEnforcementError(ValidationHookError):
    """Raised when runtime enforcement fails"""
    pass

def enforce_proactive_analysis(threshold: float = 0.8):
    """
    Decorator to enforce proactive analysis in functions
    
    Args:
        threshold: Required ratio of analysis code to total code
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function source
            source = inspect.getsource(func)
            tree = ast.parse(source)
            
            class AnalysisCounter(ast.NodeVisitor):
                def __init__(self):
                    self.total_nodes = 0
                    self.analysis_nodes = 0
                    
                def visit(self, node):
                    self.total_nodes += 1
                    # Count validation and analysis patterns
                    if isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name):
                            if any(pattern in node.func.id.lower() 
                                  for pattern in ['validate', 'check', 'analyze']):
                                self.analysis_nodes += 1
                    elif isinstance(node, ast.If):
                        # Count validation conditions
                        if isinstance(node.test, ast.Compare):
                            self.analysis_nodes += 1
                    super().generic_visit(node)
                    
            counter = AnalysisCounter()
            counter.visit(tree)
            
            if counter.total_nodes > 0:
                analysis_ratio = counter.analysis_nodes / counter.total_nodes
                if analysis_ratio < threshold:
                    logger.warning(
                        f"Function {func.__name__} has insufficient proactive analysis "
                        f"({analysis_ratio:.2f} < {threshold})"
                    )
                    
            return func(*args, **kwargs)
        return wrapper
    return decorator

def enforce_root_cause_first(func: Callable) -> Callable:
    """Decorator to enforce root cause analysis before actions"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Get function source
        source = inspect.getsource(func)
        tree = ast.parse(source)
        
        class RootCauseChecker(ast.NodeVisitor):
            def __init__(self):
                self.has_root_cause = False
                self.has_action = False
                self.action_line = 0
                self.root_cause_line = 0
                
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name):
                    # Check for action functions
                    if any(pattern in node.func.id.lower() 
                          for pattern in ['fix', 'update', 'modify', 'change']):
                        self.has_action = True
                        self.action_line = node.lineno
                elif isinstance(node.func, ast.Attribute):
                    # Check for analysis/logging
                    if 'analyze' in node.func.attr.lower():
                        self.has_root_cause = True
                        self.root_cause_line = node.lineno
                self.generic_visit(node)
                
        checker = RootCauseChecker()
        checker.visit(tree)
        
        if checker.has_action and not checker.has_root_cause:
            logger.warning(
                f"Function {func.__name__} performs actions without root cause analysis"
            )
        elif checker.has_action and checker.has_root_cause:
            if checker.action_line < checker.root_cause_line:
                logger.warning(
                    f"Function {func.__name__} performs actions before root cause analysis"
                )
                
        return func(*args, **kwargs)
    return wrapper

@contextmanager
def systematic_approach_context(name: str):
    """
    Context manager to enforce systematic approach
    
    Args:
        name: Name of the systematic process
    """
    logger.info(f"Starting systematic approach: {name}")
    try:
        # Record start of systematic process
        yield
        # Verify process completion
        logger.info(f"Completed systematic approach: {name}")
    except Exception as e:
        logger.error(f"Systematic approach failed: {name}")
        logger.error(f"Root cause: {str(e)}")
        raise RuntimeEnforcementError(f"Systematic approach {name} failed: {str(e)}")

def enforce_clear_communication(min_doc_lines: int = 3):
    """
    Decorator to enforce clear communication through documentation
    
    Args:
        min_doc_lines: Minimum number of documentation lines required
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Check docstring
            doc = inspect.getdoc(func)
            if not doc:
                logger.warning(f"Function {func.__name__} lacks documentation")
            elif len(doc.split('\n')) < min_doc_lines:
                logger.warning(
                    f"Function {func.__name__} has insufficient documentation "
                    f"({len(doc.split('\n'))} < {min_doc_lines} lines)"
                )
                
            return func(*args, **kwargs)
        return wrapper
    return decorator

def enforce_action_oriented(func: Callable) -> Callable:
    """Decorator to enforce action-oriented approach"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Get function source
        source = inspect.getsource(func)
        tree = ast.parse(source)
        
        class ActionChecker(ast.NodeVisitor):
            def __init__(self):
                self.has_action = False
                self.action_count = 0
                
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name):
                    if any(pattern in node.func.id.lower() 
                          for pattern in ['do', 'execute', 'perform', 'run']):
                        self.has_action = True
                        self.action_count += 1
                self.generic_visit(node)
                
        checker = ActionChecker()
        checker.visit(tree)
        
        if not checker.has_action:
            logger.warning(f"Function {func.__name__} lacks clear actions")
            
        return func(*args, **kwargs)
    return wrapper
