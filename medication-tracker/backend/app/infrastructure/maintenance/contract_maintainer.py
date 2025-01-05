"""
Architecture Contract Maintenance System
Last Updated: 2025-01-03T23:50:39+01:00

This system ensures the architecture contract stays in sync with the actual codebase.
It tracks changes, updates documentation, and maintains the single source of truth.
"""

import ast
import glob
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Optional
import yaml

from app.core.architecture_contract import (
    get_contract,
    DomainBoundary,
    ArchitecturalPattern,
    SystemContract
)

class ContractMaintainer:
    """Maintains the architecture contract and related documentation"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.contract = get_contract()
        self.logger = logging.getLogger("contract.maintainer")
        
    async def update_contract(self):
        """Update the contract based on current codebase"""
        changes = {
            "new_components": await self._find_new_components(),
            "modified_components": await self._find_modified_components(),
            "new_patterns": await self._find_new_patterns(),
            "new_critical_paths": await self._find_new_critical_paths(),
            "documentation_updates": await self._find_documentation_updates()
        }
        
        if any(changes.values()):
            await self._apply_changes(changes)
            await self._update_documentation()
            await self._notify_changes(changes)
    
    async def _find_new_components(self) -> Set[str]:
        """Find new components not in contract"""
        try:
            existing = set(self.contract.system_contract.domains.values())
            current = await self._scan_components()
            return current - existing
        except Exception as e:
            self.logger.error(f"Error finding new components: {str(e)}")
            return set()
    
    async def _find_modified_components(self) -> List[str]:
        """Find components that have been modified"""
        return []  # Implementation needed
    
    async def _find_new_patterns(self) -> List[str]:
        """Find new architectural patterns"""
        return []  # Implementation needed
    
    async def _find_new_critical_paths(self) -> List[str]:
        """Find new critical paths"""
        return []  # Implementation needed
    
    async def _find_documentation_updates(self) -> List[str]:
        """Find documentation that needs updating"""
        docs_to_update = []
        
        # Check critical documentation
        critical_docs = [
            "CRITICAL_PATH.md",
            "DEPLOYMENT.md",
            "SECURITY.md",
            "UNIFIED_ENFORCEMENT.md",
            "UNIFIED_SOURCE_OF_TRUTH.md"
        ]
        
        for doc in critical_docs:
            path = self.project_root / doc
            if await self._needs_update(path):
                docs_to_update.append(doc)
        
        return docs_to_update
    
    async def _needs_update(self, path: Path) -> bool:
        """Check if a document needs updating"""
        if not path.exists():
            return True
            
        # Check last modified time
        last_modified = datetime.fromtimestamp(path.stat().st_mtime)
        contract_updated = self.contract.last_updated
        
        return last_modified < contract_updated
    
    async def _scan_components(self) -> Set[str]:
        """Scan codebase for components"""
        components = set()
        
        # Scan Python files
        for py_file in self.project_root.rglob("*.py"):
            components.update(await self._analyze_python_file(py_file))
            
        # Scan TypeScript files
        for ts_file in self.project_root.rglob("*.ts"):
            components.update(await self._analyze_typescript_file(ts_file))
            
        return components
    
    async def _analyze_python_file(self, path: Path) -> Set[str]:
        """Analyze a Python file for components"""
        components = set()
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    components.add(node.name)
                elif isinstance(node, ast.FunctionDef):
                    if any(dec.id == 'require_validation' for dec in node.decorator_list):
                        components.add(node.name)
        except UnicodeDecodeError:
            # If UTF-8 fails, try with a fallback encoding
            try:
                with open(path, 'r', encoding='latin-1') as f:
                    content = f.read()
                    tree = ast.parse(content)
                    
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        components.add(node.name)
                    elif isinstance(node, ast.FunctionDef):
                        if any(dec.id == 'require_validation' for dec in node.decorator_list):
                            components.add(node.name)
            except Exception as e:
                self.logger.error(f"Error analyzing {path} with fallback encoding: {str(e)}")
        except Exception as e:
            self.logger.error(f"Error analyzing {path}: {str(e)}")
            
        return components
    
    async def _analyze_typescript_file(self, path: Path) -> Set[str]:
        """Analyze a TypeScript file for components"""
        # Implementation needed
        return set()
    
    async def _apply_changes(self, changes: Dict):
        """Apply detected changes to contract"""
        # Add new components
        for component in changes["new_components"]:
            await self._add_component(component)
            
        # Update modified components
        for component in changes["modified_components"]:
            await self._update_component(component)
            
        # Add new patterns
        for pattern in changes["new_patterns"]:
            await self._add_pattern(pattern)
            
        # Add new critical paths
        for path in changes["new_critical_paths"]:
            await self._add_critical_path(path)
    
    async def _add_component(self, component: str) -> None:
        """Add a new component to the contract"""
        try:
            # Get component details
            details = await self._analyze_component(component)
            if not details:
                self.logger.error(f"Failed to analyze component {component}")
                return

            # Add to contract
            domain = details.get("domain")
            if not domain:
                self.logger.error(f"No domain found for component {component}")
                return

            self.contract.system_contract.domains[component] = domain
            await self._update_documentation()
            
        except Exception as e:
            self.logger.error(f"Error adding component {component}: {str(e)}")
    
    async def _analyze_component(self, component: str) -> Dict:
        """Analyze a component and return its details"""
        try:
            # Get component file path
            component_path = self._get_component_path(component)
            if not component_path:
                return {}
                
            # Parse component
            with open(component_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
            # Extract domain info
            domain = {
                "name": component,
                "dependencies": [],
                "critical_paths": [],
                "validation_rules": []
            }
            
            # Analyze dependencies
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    domain["dependencies"].extend(n.name for n in node.names)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        domain["dependencies"].append(node.module)
                        
                # Check for validation decorators
                elif isinstance(node, ast.FunctionDef):
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Name) and decorator.id == 'require_validation':
                            domain["validation_rules"].append(node.name)
                            
                # Check for critical path markers
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id == 'CRITICAL_PATH':
                            if isinstance(node.value, ast.Constant):
                                domain["critical_paths"].append(node.value.value)
                                
            return domain
            
        except Exception as e:
            self.logger.error(f"Error analyzing component {component}: {str(e)}")
            return {}
            
    def _get_component_path(self, component: str) -> Optional[str]:
        """Get the file path for a component"""
        # Search in common module locations
        base_path = Path(__file__).parent.parent.parent
        possible_paths = [
            base_path / "core" / f"{component.lower()}.py",
            base_path / "services" / f"{component.lower()}.py",
            base_path / "models" / f"{component.lower()}.py",
            base_path / "routes" / f"{component.lower()}.py",
            base_path / "validation" / f"{component.lower()}.py"
        ]
        
        for path in possible_paths:
            if path.exists():
                return str(path)
                
        return None
    
    async def _update_documentation(self):
        """Update all documentation"""
        await self._update_critical_path_doc()
        await self._update_deployment_doc()
        await self._update_security_doc()
        await self._update_unified_docs()
    
    async def _update_critical_path_doc(self):
        """Update CRITICAL_PATH.md"""
        path = self.project_root / "CRITICAL_PATH.md"
        content = await self._generate_critical_path_doc()
        await self._write_doc(path, content)
    
    async def _generate_critical_path_doc(self) -> str:
        """Generate documentation for critical paths"""
        content = ["# Critical Path Documentation", ""]
        
        # Add overview
        content.extend([
            "## Overview",
            "This document outlines the critical paths in the system that require special attention during deployment.",
            "Critical paths are components and workflows that are essential for core functionality.",
            "",
        ])
        
        # Add critical paths
        content.extend([
            "## Critical Paths",
            "The following paths have been identified as critical:",
            ""
        ])
        
        for path in self.contract.system_contract.critical_paths:
            content.extend([
                f"### {path}",
                "```python",
                f"CRITICAL_PATH = '{path}'",
                "```",
                ""
            ])
            
        # Add validation rules
        content.extend([
            "## Validation Rules",
            "The following validation rules are enforced on critical paths:",
            ""
        ])
        
        for domain in self.contract.system_contract.domains.values():
            if domain.get("validation_rules"):
                content.extend([
                    f"### {domain['name']}",
                    "```python",
                    *[f"@require_validation" for rule in domain["validation_rules"]],
                    "```",
                    ""
                ])
                
        return "\n".join(content)
    
    async def _update_deployment_doc(self):
        """Update DEPLOYMENT.md"""
        path = self.project_root / "DEPLOYMENT.md"
        content = await self._generate_deployment_doc()
        await self._write_doc(path, content)
    
    async def _generate_deployment_doc(self) -> str:
        """Generate deployment documentation"""
        content = ["# Deployment Documentation", ""]
        
        # Add overview
        content.extend([
            "## Overview",
            "This document outlines the deployment process and requirements for the MedMinder application.",
            "",
            "## Environment Variables",
            "The following environment variables must be set:",
            "```",
            "DATABASE_URL=postgresql://user:pass@host:5432/dbname",
            "DB_USER=database_user",
            "DB_PASSWORD=database_password",
            "FIREBASE_CONFIG=firebase_config_json",
            "```",
            "",
            "## Dependencies",
            "### Frontend",
            "```bash",
            "npm install",
            "```",
            "",
            "### Backend",
            "```bash",
            "pip install -r requirements.txt",
            "```",
            "",
            "## Deployment Steps",
            "1. Set environment variables",
            "2. Install dependencies",
            "3. Build frontend",
            "4. Build backend",
            "5. Run database migrations",
            "6. Start services",
            "",
            "## Health Checks",
            "- Frontend: http://localhost:3000/health",
            "- Backend: http://localhost:8000/health",
            "",
            "## Monitoring",
            "- Logs are available in /var/log/medminder/",
            "- Metrics are exposed at /metrics endpoint",
            "",
            "## Rollback",
            "In case of deployment failure:",
            "1. Stop services",
            "2. Revert database migrations",
            "3. Deploy previous version",
            ""
        ])
        
        return "\n".join(content)
    
    async def _update_security_doc(self):
        """Update SECURITY.md"""
        path = self.project_root / "SECURITY.md"
        content = await self._generate_security_doc()
        await self._write_doc(path, content)
    
    async def _generate_security_doc(self) -> str:
        """Generate security documentation."""
        content = []
        content.append("# Security Documentation\n")
        content.append("## Overview\n")
        content.append("This document outlines the security measures and protocols implemented in the Medication Tracker application.\n\n")
        
        content.append("## Authentication\n")
        content.append("- Firebase Authentication is used for user authentication\n")
        content.append("- JWT tokens are required for all protected API endpoints\n")
        content.append("- Session management with secure cookie handling\n\n")
        
        content.append("## Data Protection\n")
        content.append("- All sensitive data is encrypted at rest\n")
        content.append("- HTTPS/TLS for all data in transit\n")
        content.append("- Database access is restricted and credentials are securely managed\n\n")
        
        content.append("## API Security\n")
        content.append("- Rate limiting to prevent abuse\n")
        content.append("- Input validation and sanitization\n")
        content.append("- CORS configuration for frontend access\n")
        content.append("- Security headers implementation\n\n")
        
        content.append("## Monitoring and Logging\n")
        content.append("- Security event logging\n")
        content.append("- Audit trails for sensitive operations\n")
        content.append("- Automated alerts for suspicious activities\n\n")
        
        content.append("## Compliance\n")
        content.append("- HIPAA compliance measures\n")
        content.append("- Regular security audits\n")
        content.append("- Secure deployment practices\n")
        
        return "".join(content)
    
    async def _update_unified_docs(self):
        """Update unified documentation"""
        # Update enforcement doc
        enforcement_path = self.project_root / "UNIFIED_ENFORCEMENT.md"
        enforcement_content = await self._generate_enforcement_doc()
        await self._write_doc(enforcement_path, enforcement_content)
        
        # Update source of truth doc
        truth_path = self.project_root / "UNIFIED_SOURCE_OF_TRUTH.md"
        truth_content = await self._generate_truth_doc()
        await self._write_doc(truth_path, truth_content)
    
    async def _write_doc(self, path: Path, content: str):
        """Write content to documentation file"""
        path.write_text(content, encoding='utf-8')
        self.logger.info(f"Updated documentation: {path}")
    
    async def _notify_changes(self, changes: Dict):
        """Notify about contract changes"""
        # Log changes
        self.logger.info("Contract changes detected:")
        for category, items in changes.items():
            if items:
                self.logger.info(f"  {category}:")
                for item in items:
                    self.logger.info(f"    - {item}")
        
        # Update change log
        await self._update_changelog(changes)
    
    async def _update_changelog(self, changes: Dict):
        """Update the changelog"""
        changelog_path = self.project_root / "CHANGELOG.md"
        
        # Generate changelog entry
        entry = f"""
## {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

### Contract Updates
"""
        
        for category, items in changes.items():
            if items:
                entry += f"\n#### {category.replace('_', ' ').title()}\n"
                for item in items:
                    entry += f"- {item}\n"
        
        # Prepend to changelog
        current_content = changelog_path.read_text() if changelog_path.exists() else ""
        new_content = entry + "\n" + current_content
        changelog_path.write_text(new_content, encoding='utf-8')

    async def validate_system(self) -> bool:
        """Validate entire system against contract"""
        try:
            # Validate dependencies first
            validator = ValidationOrchestrator()
            dep_result = await validator._validate_dependencies()
            if not dep_result.status:
                self.logger.error(f"Dependency validation failed: {dep_result.details}")
                return False

            # Continue with other validations
            validation_result = await validator.validate_system()
            if not validation_result:
                self.logger.error("System validation failed")
                return False

            return True
            
        except Exception as e:
            self.logger.error(f"Error during system validation: {str(e)}")
            return False

    async def _generate_enforcement_doc(self) -> str:
        """Generate enforcement documentation."""
        content = []
        content.append("# Enforcement Documentation\n")
        content.append("## Overview\n")
        content.append("This document outlines the enforcement mechanisms and validation rules implemented in the Medication Tracker application.\n\n")
        
        content.append("## Validation Rules\n")
        content.append("- Input validation for all user-provided data\n")
        content.append("- Medication interaction checks\n")
        content.append("- Schedule conflict detection\n")
        content.append("- Dosage limit enforcement\n\n")
        
        content.append("## Access Control\n")
        content.append("- Role-based access control (RBAC)\n")
        content.append("- Resource ownership validation\n")
        content.append("- API endpoint protection\n\n")
        
        content.append("## Data Integrity\n")
        content.append("- Transaction management\n")
        content.append("- Data consistency checks\n")
        content.append("- Audit trail maintenance\n\n")
        
        content.append("## Error Handling\n")
        content.append("- Graceful error recovery\n")
        content.append("- Error logging and monitoring\n")
        content.append("- User notification system\n\n")
        
        content.append("## Compliance Enforcement\n")
        content.append("- HIPAA compliance checks\n")
        content.append("- Data retention policies\n")
        content.append("- Privacy requirements\n")
        
        return "".join(content)

# Global maintainer instance
_maintainer: Optional[ContractMaintainer] = None

def get_maintainer(project_root: Optional[Path] = None) -> ContractMaintainer:
    """Get the global maintainer instance"""
    global _maintainer
    if _maintainer is None:
        if project_root is None:
            raise ValueError("project_root required for initialization")
        _maintainer = ContractMaintainer(project_root)
    return _maintainer
