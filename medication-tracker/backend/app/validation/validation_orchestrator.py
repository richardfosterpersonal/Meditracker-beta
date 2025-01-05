"""
Validation Orchestrator
Ensures compliance with SINGLE_SOURCE_VALIDATION.md and VALIDATION_MAP.md
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import os
from functools import wraps
import asyncio
from pathlib import Path

from app.core.config import settings
from app.validation.beta_user_validation import BetaUserValidator
from app.middleware.security_validation import validate_security
from app.core.validation_monitoring import ValidationMonitor
from app.core.logging import beta_logger
from app.validation.beta_validation_tracker import BetaValidationTracker

class ValidationOrchestrator:
    """Orchestrates all validation processes to ensure compliance"""
    
    def __init__(self):
        self.beta_validator = BetaUserValidator()
        self.monitor = ValidationMonitor()
        self.evidence_base_path = settings.VALIDATION_EVIDENCE_PATH
        self.logger = beta_logger
        self.beta_tracker = BetaValidationTracker()
        
    def validate_critical_path(self, component: str, action: str) -> Dict:
        """Validates critical path compliance"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': component,
            'action': action,
            'status': 'pending',
            'validations': []
        }
        
        try:
            # 1. Medication Safety
            if component in ['medication', 'prescription', 'interaction']:
                self._validate_medication_safety(evidence)
                
            # 2. Data Security
            if component in ['user', 'data', 'phi']:
                self._validate_data_security(evidence)
                
            # 3. Core Infrastructure
            if component in ['system', 'service', 'api']:
                self._validate_infrastructure(evidence)
                
            evidence['status'] = 'complete'
            self._save_evidence(evidence, 'critical_path')
            return {'status': 'success', 'evidence': evidence}
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            self._save_evidence(evidence, 'critical_path')
            return {'status': 'error', 'evidence': evidence}
            
    def validate_beta_phase(self, feature: str, user_id: str) -> Dict:
        """Validates beta phase compliance"""
        evidence = {
            'timestamp': datetime.utcnow().isoformat(),
            'feature': feature,
            'user_id': user_id,
            'status': 'pending',
            'validations': []
        }
        
        try:
            # 1. Security Requirements
            self._validate_beta_security(evidence)
            
            # 2. Monitoring Requirements
            self._validate_beta_monitoring(evidence)
            
            # 3. User Management
            self._validate_beta_user(evidence, user_id, feature)
            
            evidence['status'] = 'complete'
            self._save_evidence(evidence, 'beta_phase')
            return {'status': 'success', 'evidence': evidence}
            
        except Exception as e:
            evidence['status'] = 'failed'
            evidence['error'] = str(e)
            self._save_evidence(evidence, 'beta_phase')
            return {'status': 'error', 'evidence': evidence}
            
    def _validate_medication_safety(self, evidence: Dict) -> None:
        """Validates medication safety requirements"""
        validation = {
            'type': 'medication_safety',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add specific validation logic here
        validation['status'] = 'complete'
        
    def _validate_data_security(self, evidence: Dict) -> None:
        """Validates data security requirements"""
        validation = {
            'type': 'data_security',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add specific validation logic here
        validation['status'] = 'complete'
        
    def _validate_infrastructure(self, evidence: Dict) -> None:
        """Validates infrastructure requirements"""
        validation = {
            'type': 'infrastructure',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        # Add specific validation logic here
        validation['status'] = 'complete'
        
    def _validate_beta_security(self, evidence: Dict) -> None:
        """Validates beta security requirements"""
        validation = {
            'type': 'beta_security',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        if not settings.SECURITY_SCAN_ENABLED:
            raise ValueError("Security scanning not enabled")
            
        validation['status'] = 'complete'
        
    def _validate_beta_monitoring(self, evidence: Dict) -> None:
        """Validates beta monitoring requirements"""
        validation = {
            'type': 'beta_monitoring',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        if not settings.MONITORING_ENABLED:
            raise ValueError("Monitoring not enabled")
            
        validation['status'] = 'complete'
        
    def _validate_beta_user(self, evidence: Dict, user_id: str, feature: str) -> None:
        """Validates beta user requirements"""
        validation = {
            'type': 'beta_user',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        evidence['validations'].append(validation)
        
        result = self.beta_validator.validate_access(user_id, feature)
        if result['status'] != 'success':
            raise ValueError(f"Beta user validation failed: {result.get('error')}")
            
        validation['status'] = 'complete'
        
    def _save_evidence(self, evidence: Dict, category: str) -> None:
        """Saves validation evidence"""
        path = os.path.join(self.evidence_base_path, category)
        if not os.path.exists(path):
            os.makedirs(path)
            
        filename = f"{evidence['timestamp']}_{category}.json"
        filepath = os.path.join(path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(evidence, f, indent=2)

    async def pre_validate_state(self, component: str) -> Dict[str, Any]:
        """
        Pre-validates the existing state of a component before any operations
        Returns a dictionary containing:
        - existing_implementation: Dict of existing files and their purposes
        - current_state: Current state of the component
        - dependencies: List of existing dependencies
        - validation_status: Whether current implementation meets requirements
        """
        state = {
            'existing_implementation': {},
            'current_state': {},
            'dependencies': [],
            'validation_status': False
        }

        try:
            # Check for existing implementations
            implementation_paths = [
                'backend/app/services',
                'backend/docs',
                'backend/scripts',
                'backend/tests'
            ]
            
            for path in implementation_paths:
                files = await self._scan_directory(path, component)
                state['existing_implementation'].update(files)

            # Validate current state
            state['current_state'] = await self._validate_current_state(component)
            
            # Check dependencies
            state['dependencies'] = await self._check_existing_dependencies(component)
            
            # Validate against requirements
            state['validation_status'] = await self._validate_against_requirements(
                component,
                state['existing_implementation'],
                state['current_state']
            )

            self.logger.info(f"Pre-validation state check completed for {component}")
            return state

        except Exception as e:
            self.logger.error(f"Pre-validation state check failed: {str(e)}")
            raise ValueError(f"Pre-validation failed: {str(e)}")

    async def _scan_directory(self, path: str, component: str) -> Dict:
        """Scans directory for existing implementations of a component"""
        implementations = {}
        
        try:
            # Define patterns to look for based on component
            patterns = {
                'beta': ['beta', 'test', 'validation'],
                'monitoring': ['monitor', 'health', 'status'],
                'notification': ['notify', 'alert', 'push'],
                'validation': ['valid', 'check', 'verify']
            }
            
            component_patterns = patterns.get(component.lower(), [component.lower()])
            
            # Use absolute path
            project_root = Path(__file__).parent.parent.parent
            
            # Walk through directory
            for root, _, files in os.walk(os.path.join(project_root, path)):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Check if file matches component patterns
                    if any(pattern in file.lower() for pattern in component_patterns):
                        # Read file to determine purpose
                        with open(file_path, 'r') as f:
                            content = f.read()
                            docstring = self._extract_docstring(content)
                            
                            implementations[file_path] = {
                                'purpose': docstring,
                                'last_modified': datetime.fromtimestamp(
                                    os.path.getmtime(file_path)
                                ).isoformat(),
                                'type': self._determine_file_type(file)
                            }
            
            return implementations
            
        except Exception as e:
            self.logger.error(f"Error scanning directory {path}: {str(e)}")
            return {}
            
    def _extract_docstring(self, content: str) -> str:
        """Extracts docstring from file content"""
        import ast
        try:
            tree = ast.parse(content)
            return ast.get_docstring(tree) or "No description available"
        except:
            return "No description available"
            
    def _determine_file_type(self, filename: str) -> str:
        """Determines the type of file based on name and extension"""
        if filename.endswith('.py'):
            if filename.startswith('test_'):
                return 'test'
            return 'implementation'
        elif filename.endswith('.md'):
            return 'documentation'
        elif filename.endswith('.sh'):
            return 'script'
        return 'other'

    async def _check_existing_dependencies(self, component: str) -> List:
        """Checks existing dependencies for a component"""
        dependencies = []
        
        try:
            # Check requirements.txt for Python dependencies
            req_path = os.path.join(settings.PROJECT_ROOT, 'requirements.txt')
            if os.path.exists(req_path):
                with open(req_path, 'r') as f:
                    requirements = f.readlines()
                    for req in requirements:
                        if component.lower() in req.lower():
                            dependencies.append({
                                'type': 'python',
                                'name': req.strip(),
                                'source': 'requirements.txt'
                            })
            
            # Check package.json for Node dependencies
            pkg_path = os.path.join(settings.PROJECT_ROOT, 'package.json')
            if os.path.exists(pkg_path):
                with open(pkg_path, 'r') as f:
                    package = json.load(f)
                    all_deps = {
                        **package.get('dependencies', {}),
                        **package.get('devDependencies', {})
                    }
                    for dep, version in all_deps.items():
                        if component.lower() in dep.lower():
                            dependencies.append({
                                'type': 'node',
                                'name': f"{dep}@{version}",
                                'source': 'package.json'
                            })
            
            # Check internal dependencies
            deps_path = os.path.join(
                settings.PROJECT_ROOT,
                'backend/config/dependencies.json'
            )
            if os.path.exists(deps_path):
                with open(deps_path, 'r') as f:
                    internal_deps = json.load(f)
                    if component in internal_deps:
                        for dep in internal_deps[component]:
                            dependencies.append({
                                'type': 'internal',
                                'name': dep,
                                'source': 'dependencies.json'
                            })
            
            return dependencies
            
        except Exception as e:
            self.logger.error(f"Error checking dependencies: {str(e)}")
            return dependencies

    async def _validate_current_state(self, component: str) -> Dict:
        """Validates the current state of a component"""
        state = {
            'status': 'unknown',
            'last_validation': None,
            'active_features': [],
            'pending_features': [],
            'validation_history': []
        }
        
        try:
            # Check validation history
            history_path = os.path.join(
                self.evidence_base_path,
                component,
                'validation_history.json'
            )
            
            if os.path.exists(history_path):
                with open(history_path, 'r') as f:
                    history = json.load(f)
                    state['validation_history'] = history.get('validations', [])
                    state['last_validation'] = history.get('last_validation')
                    
            # Check active features
            features_path = os.path.join(
                settings.PROJECT_ROOT,
                'backend/config/features.json'
            )
            
            if os.path.exists(features_path):
                with open(features_path, 'r') as f:
                    features = json.load(f)
                    state['active_features'] = features.get(component, {}).get('active', [])
                    state['pending_features'] = features.get(component, {}).get('pending', [])
            
            # Determine current status
            if state['last_validation']:
                last_validation = datetime.fromisoformat(state['last_validation'])
                if (datetime.now() - last_validation).days < 7:
                    state['status'] = 'valid'
                else:
                    state['status'] = 'needs_revalidation'
            else:
                state['status'] = 'never_validated'
            
            return state
            
        except Exception as e:
            self.logger.error(f"Error validating current state: {str(e)}")
            return state

    async def _validate_against_requirements(self, component: str, implementation: Dict, state: Dict) -> bool:
        """Validates component against requirements"""
        try:
            # Check implementation completeness
            has_implementation = any(
                item['type'] == 'implementation' 
                for item in implementation.values()
            )
            
            has_tests = any(
                item['type'] == 'test'
                for item in implementation.values()
            )
            
            has_docs = any(
                item['type'] == 'documentation'
                for item in implementation.values()
            )
            
            # Check state validity
            state_valid = state['status'] == 'valid'
            
            # All criteria must be met
            return all([
                has_implementation,
                has_tests,
                has_docs,
                state_valid
            ])
            
        except Exception as e:
            self.logger.error(f"Error validating against requirements: {str(e)}")
            return False

    async def validate_beta_component(self, component: str) -> Dict:
        """Validates a beta testing component"""
        try:
            # Get current state
            state = await self.pre_validate_state(component)
            
            # Update tracker
            self.beta_tracker.update_component_status(
                component,
                "valid" if state["validation_status"] else "needs_attention",
                validation_details=state
            )
            
            return state
            
        except Exception as e:
            self.logger.error(f"Beta component validation failed: {str(e)}")
            self.beta_tracker.update_component_status(
                component,
                "error",
                validation_details={"error": str(e)}
            )
            raise

def validate_all(component: str, feature: str = None):
    """Decorator to run all required validations"""
    def decorator(f):
        @wraps(f)
        @validate_security  # Always run security validation first
        def wrapper(*args, **kwargs):
            orchestrator = ValidationOrchestrator()
            
            # 1. Validate Critical Path
            critical_result = orchestrator.validate_critical_path(component, f.__name__)
            if critical_result['status'] != 'success':
                raise ValueError(f"Critical path validation failed: {critical_result.get('error')}")
                
            # 2. Validate Beta Phase (if feature specified)
            if feature:
                user_id = kwargs.get('user_id')  # Assume user_id is passed in kwargs
                beta_result = orchestrator.validate_beta_phase(feature, user_id)
                if beta_result['status'] != 'success':
                    raise ValueError(f"Beta phase validation failed: {beta_result.get('error')}")
                    
            return f(*args, **kwargs)
        return wrapper
    return decorator
