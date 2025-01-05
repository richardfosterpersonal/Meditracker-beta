"""
Sonar Scope Checker
Last Updated: 2024-12-25T23:01:25+01:00
Critical Path: Tools.Validation

Intelligent scope checker that prevents scope creep while allowing authorized improvements.
"""

import os
import sys
import ast
import logging
from pathlib import Path
from typing import List, Set, Dict, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from app.core.scope_validation import (
    ValidationContext,
    ValidationStatus,
    get_validation_context,
    validate_feature_addition,
    check_scope_compliance
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScopeVisitor(ast.NodeVisitor):
    """AST visitor for scope analysis"""
    
    def __init__(self, file_path: str, context: ValidationContext):
        self.file_path = file_path
        self.context = context
        self.features: Set[str] = set()
        self.issues: List[str] = []
        
    def visit_ClassDef(self, node: ast.ClassDef):
        """Visit class definitions"""
        self.features.add(node.name)
        self.generic_visit(node)
        
    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Visit function definitions"""
        if not node.name.startswith('_'):  # Skip private methods
            self.features.add(node.name)
        self.generic_visit(node)

def analyze_file(file_path: str, context: Optional[ValidationContext] = None) -> List[str]:
    """Analyze a single file for scope compliance"""
    if context is None:
        context = get_validation_context(file_path)
    
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=file_path)
            
        visitor = ScopeVisitor(file_path, context)
        visitor.visit(tree)
        
        # Validate each feature
        for feature in visitor.features:
            if not validate_feature_addition(feature, file_path, context):
                issues.append(f"Feature '{feature}' in {file_path} requires validation")
                
        issues.extend(visitor.issues)
        
    except Exception as e:
        logger.error(f"Error analyzing {file_path}: {str(e)}")
        issues.append(f"Error analyzing {file_path}: {str(e)}")
    
    return issues

def analyze_directory(directory: str) -> Dict[str, List[str]]:
    """Analyze a directory for scope compliance"""
    issues_by_file: Dict[str, List[str]] = {}
    
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.py'):
                continue
                
            file_path = os.path.join(root, file)
            context = get_validation_context(file_path)
            
            # Skip authorized files
            if context.is_authorized:
                logger.info(f"Skipping authorized file: {file_path}")
                continue
            
            # Check directory compliance first
            if not check_scope_compliance(root, context):
                issues_by_file[file_path] = [f"Directory {root} is not scope compliant"]
                continue
            
            # Analyze file
            issues = analyze_file(file_path, context)
            if issues:
                issues_by_file[file_path] = issues
    
    return issues_by_file

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python sonar-scope-check.py <directory>")
        sys.exit(1)
    
    directory = sys.argv[1]
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a directory")
        sys.exit(1)
    
    logger.info(f"Analyzing directory: {directory}")
    issues_by_file = analyze_directory(directory)
    
    if issues_by_file:
        print("\nScope Validation Issues:")
        for file_path, issues in issues_by_file.items():
            print(f"\n{file_path}:")
            for issue in issues:
                print(f"  - {issue}")
        sys.exit(1)
    else:
        print("\nNo scope validation issues found!")
        sys.exit(0)

if __name__ == '__main__':
    main()
