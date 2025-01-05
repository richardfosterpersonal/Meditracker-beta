"""
Version validation for beta testing
Critical Path: VALIDATION-VERSION-*
Last Updated: 2025-01-01T21:25:04+01:00
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path

from ..validation_chain import ValidationComponent, ValidationType
from ...exceptions import ValidationError

logger = logging.getLogger(__name__)

class VersionValidator:
    """Validates version compatibility and requirements"""
    
    def __init__(self):
        self.logger = logger
        
    async def validate_version(
        self,
        component: ValidationComponent,
        version_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate version compatibility
        Returns validation results
        """
        try:
            self.logger.info(f"Validating version for component: {component}")
            
            results = {
                "valid": True,
                "errors": [],
                "warnings": [],
                "component": component,
                "version": version_data.get("version"),
                "timestamp": version_data.get("timestamp")
            }
            
            # Version format check
            if not self._validate_version_format(version_data.get("version")):
                results["valid"] = False
                results["errors"].append("Invalid version format")
                
            # Component compatibility check
            if not self._check_component_compatibility(
                component,
                version_data.get("version")
            ):
                results["valid"] = False
                results["errors"].append("Component version incompatible")
                
            # Dependencies check
            deps_check = self._validate_dependencies(version_data.get("dependencies", {}))
            if not deps_check["valid"]:
                results["valid"] = False
                results["errors"].extend(deps_check["errors"])
                
            return results
            
        except Exception as e:
            self.logger.error(f"Version validation failed: {str(e)}")
            raise ValidationError(f"Version validation error: {str(e)}")
            
    def _validate_version_format(self, version: str) -> bool:
        """Validate version string format"""
        if not version:
            return False
            
        # Basic semver validation
        parts = version.split(".")
        if len(parts) != 3:
            return False
            
        try:
            major, minor, patch = map(int, parts)
            return True
        except ValueError:
            return False
            
    def _check_component_compatibility(
        self,
        component: ValidationComponent,
        version: str
    ) -> bool:
        """Check component version compatibility"""
        # For beta, we require version >= 0.1.0
        if not version:
            return False
            
        try:
            major, minor, _ = map(int, version.split("."))
            return major >= 0 and minor >= 1
        except ValueError:
            return False
            
    def _validate_dependencies(self, dependencies: Dict[str, str]) -> Dict[str, Any]:
        """Validate dependency versions"""
        results = {
            "valid": True,
            "errors": []
        }
        
        for dep, version in dependencies.items():
            if not self._validate_version_format(version):
                results["valid"] = False
                results["errors"].append(f"Invalid version for dependency {dep}")
                
        return results
