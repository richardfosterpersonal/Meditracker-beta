"""
Document Hierarchy Validator
Last Updated: 2024-12-25T11:43:14+01:00
Reference: DOCUMENT_HIERARCHY.md
Parent: MASTER_CRITICAL_PATH.md
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Set, Optional
from dataclasses import dataclass

@dataclass
class DocumentNode:
    path: str
    level: int
    references: Set[str]
    children: List['DocumentNode']

class DocumentValidator:
    """Validates document hierarchy and prevents circular references"""
    
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.master_path = "docs/validation/MASTER_CRITICAL_PATH.md"
        self.document_tree: Optional[DocumentNode] = None
        self.reference_map: Dict[str, Set[str]] = {}
    
    def build_document_tree(self) -> None:
        """Builds document tree and validates hierarchy"""
        self.document_tree = self._build_node(self.master_path, 0)
        self._validate_tree(self.document_tree)
    
    def validate_document(self, doc_path: str) -> List[str]:
        """Validates a single document's references"""
        errors = []
        doc_content = self._read_file(doc_path)
        references = self._extract_references(doc_content)
        
        # Check reference hierarchy
        doc_level = self._get_document_level(doc_path)
        for ref in references:
            ref_level = self._get_document_level(ref)
            if ref_level > doc_level:
                errors.append(f"Invalid reference: {ref} (lower level) from {doc_path}")
        
        # Check for circular references
        if self._has_circular_reference(doc_path, references):
            errors.append(f"Circular reference detected in {doc_path}")
        
        return errors
    
    def update_references(self, doc_path: str, new_content: str) -> str:
        """Updates document references maintaining hierarchy"""
        doc_level = self._get_document_level(doc_path)
        current_refs = self._extract_references(new_content)
        
        # Ensure master reference
        if doc_level > 0 and self.master_path not in current_refs:
            new_content = f"Reference: {self.master_path}\n{new_content}"
        
        # Validate and update references
        valid_refs = set()
        for ref in current_refs:
            if self._is_valid_reference(doc_path, ref):
                valid_refs.add(ref)
        
        return self._update_reference_section(new_content, valid_refs)
    
    def _build_node(self, path: str, level: int) -> DocumentNode:
        """Recursively builds document tree"""
        content = self._read_file(path)
        references = self._extract_references(content)
        children = []
        
        # Find and process child documents
        for ref in references:
            if self._is_child_reference(path, ref):
                child_node = self._build_node(ref, level + 1)
                children.append(child_node)
        
        return DocumentNode(path, level, references, children)
    
    def _validate_tree(self, node: DocumentNode) -> None:
        """Validates entire document tree"""
        # Check this node's references
        self._validate_node_references(node)
        
        # Recursively validate children
        for child in node.children:
            self._validate_tree(child)
    
    def _has_circular_reference(self, doc_path: str, references: Set[str]) -> bool:
        """Checks for circular references"""
        visited = set()
        
        def check_circular(current: str, checking: Set[str]) -> bool:
            if current in checking:
                return True
            if current in visited:
                return False
                
            visited.add(current)
            checking.add(current)
            
            current_refs = self.reference_map.get(current, set())
            for ref in current_refs:
                if check_circular(ref, checking):
                    return True
                    
            checking.remove(current)
            return False
        
        return check_circular(doc_path, set())
    
    def _get_document_level(self, path: str) -> int:
        """Gets document's hierarchy level"""
        if path == self.master_path:
            return 0
        
        # Implementation would determine level based on path/content
        return 1
    
    def _is_valid_reference(self, source: str, target: str) -> bool:
        """Checks if reference is valid in hierarchy"""
        source_level = self._get_document_level(source)
        target_level = self._get_document_level(target)
        return target_level <= source_level
    
    def _read_file(self, path: str) -> str:
        """Reads file content"""
        full_path = self.root_dir / path
        with open(full_path, 'r') as f:
            return f.read()
    
    def _extract_references(self, content: str) -> Set[str]:
        """Extracts document references"""
        references = set()
        for line in content.split('\n'):
            if 'Reference:' in line:
                ref = line.split('Reference:')[1].strip()
                references.add(ref)
        return references
    
    def _update_reference_section(self, content: str, references: Set[str]) -> str:
        """Updates document's reference section"""
        # Implementation would update reference section
        return content
