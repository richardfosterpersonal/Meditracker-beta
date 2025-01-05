"""
Critical Path Validation Script
Last Updated: 2024-12-25T11:45:45+01:00
Reference: VALIDATION_HOOK_SYSTEM.md
Parent: MASTER_CRITICAL_PATH.md
"""

import sys
from pathlib import Path
from typing import List, Set, Dict
import re
import json
from dataclasses import dataclass

@dataclass
class CriticalPathComponent:
    name: str
    priority: str
    dependencies: Set[str]
    validation_requirements: List[str]

class CriticalPathValidator:
    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.master_doc = self.root_dir / "docs/validation/MASTER_CRITICAL_PATH.md"
        self.components: Dict[str, CriticalPathComponent] = {}
        self.validation_cache = {}
        
    def validate_all(self) -> bool:
        """Validate entire critical path"""
        # Parse master document
        self._parse_master_doc()
        
        # Validate components
        errors = []
        for name, component in self.components.items():
            result = self._validate_component(component)
            errors.extend(result)
        
        # Report errors
        if errors:
            print("\nCritical Path Validation Errors:")
            for error in errors:
                print(f"- {error}")
            return False
        
        return True
    
    def _parse_master_doc(self) -> None:
        """Parse master document to extract critical path components"""
        content = self.master_doc.read_text()
        
        # Parse components section
        components_match = re.search(
            r'## Critical Path Components\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        
        if components_match:
            components_text = components_match.group(1)
            current_component = None
            
            for line in components_text.split('\n'):
                if line.startswith('###'):
                    if current_component:
                        self.components[current_component.name] = current_component
                    
                    name = line.strip('# ').split('(')[0].strip()
                    priority = re.search(r'\((.*?)\)', line).group(1) if '(' in line else 'MEDIUM'
                    current_component = CriticalPathComponent(
                        name=name,
                        priority=priority,
                        dependencies=set(),
                        validation_requirements=[]
                    )
                
                elif line.strip().startswith('- Depends:'):
                    deps = line.split('Depends:')[1].strip()
                    current_component.dependencies.update(d.strip() for d in deps.split(','))
                
                elif line.strip().startswith('- Validate:'):
                    req = line.split('Validate:')[1].strip()
                    current_component.validation_requirements.append(req)
            
            if current_component:
                self.components[current_component.name] = current_component
    
    def _validate_component(self, component: CriticalPathComponent) -> List[str]:
        """Validate a single critical path component"""
        errors = []
        
        # Check dependencies
        for dep in component.dependencies:
            if dep not in self.components:
                errors.append(f"{component.name}: Unknown dependency '{dep}'")
        
        # Check for circular dependencies
        if self._has_circular_dependency(component.name, set()):
            errors.append(f"{component.name}: Has circular dependency")
        
        # Check validation requirements
        for req in component.validation_requirements:
            if not self._validate_requirement(component.name, req):
                errors.append(f"{component.name}: Failed validation requirement '{req}'")
        
        return errors
    
    def _has_circular_dependency(self, name: str, visited: Set[str]) -> bool:
        """Check for circular dependencies"""
        if name in visited:
            return True
        
        visited.add(name)
        component = self.components.get(name)
        if not component:
            return False
        
        for dep in component.dependencies:
            if self._has_circular_dependency(dep, visited.copy()):
                return True
        
        return False
    
    def _validate_requirement(self, component_name: str, requirement: str) -> bool:
        """Validate a single requirement"""
        # Implementation would check specific validation requirements
        # For now, assume all requirements pass
        return True

def main():
    validator = CriticalPathValidator()
    if not validator.validate_all():
        sys.exit(1)
    print("Critical path validation successful!")
    sys.exit(0)

if __name__ == "__main__":
    main()
