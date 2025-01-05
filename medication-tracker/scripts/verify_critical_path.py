"""
Critical Path Verification Script
Critical Path: VALIDATION-VERIFY-CRITICAL
Last Updated: 2025-01-02T13:29:35+01:00

Verifies critical path integrity across ALL system components.
"""

import os
import sys
import ast
import glob
import networkx as nx
from pathlib import Path
from typing import Dict, Set, List, Tuple

def build_critical_path_graph() -> nx.DiGraph:
    """Build graph of critical path dependencies"""
    G = nx.DiGraph()
    
    # Add all critical paths
    critical_paths = extract_critical_paths()
    for path in critical_paths:
        components = path.split('.')
        for i in range(len(components) - 1):
            G.add_edge(components[i], components[i + 1])
            
    return G

def extract_critical_paths() -> Set[str]:
    """Extract all critical paths from codebase"""
    project_root = Path(__file__).parent.parent
    python_files = glob.glob(f"{str(project_root)}/**/*.py", recursive=True)
    
    critical_paths: Set[str] = set()
    
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Str):
                    if 'Critical Path:' in node.s:
                        path = node.s.split('Critical Path:')[1].strip()
                        critical_paths.add(path)
                        
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            
    return critical_paths

def verify_critical_path_integrity(G: nx.DiGraph) -> Tuple[bool, List[str]]:
    """Verify critical path integrity"""
    errors = []
    
    # Check for cycles
    try:
        cycles = list(nx.simple_cycles(G))
        if cycles:
            errors.append("Critical path contains cycles:")
            for cycle in cycles:
                errors.append(f"- {' -> '.join(cycle)}")
    except Exception as e:
        errors.append(f"Error checking for cycles: {str(e)}")
        
    # Check for disconnected components
    if not nx.is_weakly_connected(G):
        components = list(nx.weakly_connected_components(G))
        errors.append("Critical path contains disconnected components:")
        for comp in components:
            errors.append(f"- {', '.join(comp)}")
            
    # Check for orphaned nodes
    orphans = [n for n in G.nodes() if G.in_degree(n) == 0 and G.out_degree(n) == 0]
    if orphans:
        errors.append("Critical path contains orphaned components:")
        for orphan in orphans:
            errors.append(f"- {orphan}")
            
    return len(errors) == 0, errors

def main():
    """Main verification function"""
    print("Building critical path graph...")
    G = build_critical_path_graph()
    
    print("Verifying critical path integrity...")
    is_valid, errors = verify_critical_path_integrity(G)
    
    if not is_valid:
        print("\nCritical path verification failed!")
        print("The following errors were found:")
        for error in errors:
            print(error)
        sys.exit(1)
        
    print("\nCritical path verification passed!")
    sys.exit(0)

if __name__ == '__main__':
    main()
