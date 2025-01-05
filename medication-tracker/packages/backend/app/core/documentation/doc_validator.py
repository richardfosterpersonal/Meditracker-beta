"""
Documentation Validator
Ensures documentation is in sync with codebase
Last Updated: 2025-01-01T20:26:52+01:00
"""

import asyncio
from datetime import datetime
import logging
from pathlib import Path
from typing import Dict, List, Optional
import yaml
import re

from ...exceptions import DocumentationError

class DocumentationValidator:
    """Validates documentation synchronization with codebase"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.root_dir = Path(__file__).parent.parent.parent.parent.parent
        self.docs_dir = self.root_dir / "docs"
        
        # Load architecture definition
        self.architecture = self._load_architecture()
        
        # Track documentation timestamps
        self._doc_timestamps: Dict[str, str] = {}
        self._timestamp_lock = asyncio.Lock()
        
    def _load_architecture(self) -> Dict:
        """Load architecture definition"""
        arch_file = self.root_dir / "docs" / "architecture.yaml"
        if not arch_file.exists():
            raise DocumentationError("Architecture definition not found")
            
        with open(arch_file) as f:
            return yaml.safe_load(f)
            
    async def validate_component(self, component: str) -> Dict:
        """Validate documentation for a component"""
        try:
            # Get component definition
            comp_def = self.architecture.get("components", {}).get(component)
            if not comp_def:
                raise DocumentationError(f"Component {component} not found in architecture")
                
            # Check required documentation exists
            missing_docs = []
            for doc in comp_def.get("documentation", []):
                doc_path = self.root_dir / doc
                if not doc_path.exists():
                    missing_docs.append(doc)
                    
            if missing_docs:
                return {
                    "valid": False,
                    "error": "Missing documentation files",
                    "details": {"missing": missing_docs},
                    "component": component,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            # Validate each documentation file
            results = []
            for doc in comp_def.get("documentation", []):
                result = await self._validate_doc_file(doc)
                results.append(result)
                if not result["valid"]:
                    return {
                        "valid": False,
                        "error": f"Documentation validation failed for {doc}",
                        "details": result,
                        "component": component,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
            return {
                "valid": True,
                "component": component,
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Documentation validation failed: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "component": component,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    async def _validate_doc_file(self, doc_path: str) -> Dict:
        """Validate a documentation file"""
        try:
            full_path = self.root_dir / doc_path
            content = full_path.read_text()
            
            # Check for last updated timestamp
            timestamp_match = re.search(r"Last Updated: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})", content)
            if not timestamp_match:
                return {
                    "valid": False,
                    "error": "Missing last updated timestamp",
                    "file": doc_path,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            # Store timestamp
            async with self._timestamp_lock:
                self._doc_timestamps[doc_path] = timestamp_match.group(1)
                
            # Validate markdown links
            if doc_path.endswith(".md"):
                invalid_links = self._validate_markdown_links(content)
                if invalid_links:
                    return {
                        "valid": False,
                        "error": "Invalid markdown links found",
                        "details": {"invalid_links": invalid_links},
                        "file": doc_path,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
            return {
                "valid": True,
                "file": doc_path,
                "last_updated": timestamp_match.group(1),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Documentation file validation failed: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "file": doc_path,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    def _validate_markdown_links(self, content: str) -> List[str]:
        """Validate markdown links in content"""
        # Find all markdown links
        links = re.findall(r"\[([^\]]+)\]\(([^\)]+)\)", content)
        
        invalid_links = []
        for text, link in links:
            # Skip external links
            if link.startswith(("http://", "https://")):
                continue
                
            # Check if internal link exists
            link_path = self.root_dir / link
            if not link_path.exists():
                invalid_links.append(link)
                
        return invalid_links
        
    async def get_doc_timestamps(self) -> Dict[str, str]:
        """Get documentation timestamps"""
        async with self._timestamp_lock:
            return self._doc_timestamps.copy()
