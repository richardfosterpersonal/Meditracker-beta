#!/usr/bin/env python
"""
Pre-commit hook to enforce documentation consistency
Critical Path: Validation.Documentation.Hooks
"""

import os
import sys
from pathlib import Path
import re
from typing import List, Set

def get_referenced_files(file_path: Path) -> Set[str]:
    """Extract file references from markdown and python files"""
    with open(file_path) as f:
        content = f.read()
    
    # Find markdown style links
    md_refs = set(re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content))
    # Find python style imports
    py_refs = set(re.findall(r'from\s+(\S+)\s+import', content))
    # Find direct file references
    file_refs = set(re.findall(r'(?:file://|[\'"])([\w/./-]+\.(?:py|md))[\'"]', content))
    
    return md_refs.union(py_refs).union(file_refs)

def validate_references(changed_files: List[Path]) -> bool:
    """Validate two-way references between files"""
    project_root = Path(__file__).parent.parent.parent
    validation_files = {
        project_root / 'docs' / 'validation' / 'CURRENT_STATUS.md',
        project_root / 'docs' / 'PRODUCTION_BACKLOG.md',
        project_root / 'backend' / 'app' / 'core' / 'validation_recovery.py'
    }
    
    # Add changed files that are .py or .md
    validation_files.update({
        f for f in changed_files 
        if f.suffix in ('.py', '.md')
    })
    
    # Check for circular references
    ref_graph = {}
    for file in validation_files:
        if file.exists():
            refs = get_referenced_files(file)
            ref_graph[str(file)] = refs
    
    def has_cycle(node: str, visited: Set[str], path: Set[str]) -> bool:
        """DFS to detect cycles in reference graph"""
        visited.add(node)
        path.add(node)
        
        for neighbor in ref_graph.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor, visited, path):
                    return True
            elif neighbor in path:
                print(f"❌ Circular reference detected: {node} -> {neighbor}")
                return True
        
        path.remove(node)
        return False
    
    # Check for cycles
    visited = set()
    for node in ref_graph:
        if node not in visited:
            if has_cycle(node, visited, set()):
                return False
    
    # Validate two-way references
    for file in validation_files:
        if not file.exists():
            continue
            
        refs = get_referenced_files(file)
        for ref in refs:
            ref_path = project_root / ref
            if ref_path.exists():
                back_refs = get_referenced_files(ref_path)
                if str(file) not in back_refs:
                    print(f"❌ Missing back-reference: {ref} should reference {file}")
                    return False
    
    return True

def main():
    """Main hook function"""
    changed_files = [
        Path(f.strip('"'))
        for f in sys.argv[1:]
    ]
    
    if not validate_references(changed_files):
        print("❌ Pre-commit validation failed: Documentation inconsistencies found")
        sys.exit(1)
    
    print("✅ Documentation validation passed")
    sys.exit(0)

if __name__ == '__main__':
    main()
