"""
System Architecture Contract
Last Updated: 2025-01-03T23:29:39+01:00

This contract serves as the definitive source of truth for the MedMinder application architecture.
All components MUST comply with this contract. No exceptions.
"""

from enum import Enum
from typing import Dict, List, Set, Type, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class DomainBoundary(str, Enum):
    """Core business domains"""
    MEDICATION = "medication"
    NOTIFICATION = "notification"
    USER = "user"
    FAMILY = "family"
    MONITORING = "monitoring"
    SECURITY = "security"
    DEPLOYMENT = "deployment"

class ArchitecturalPattern(str, Enum):
    """Enforced architectural patterns"""
    REPOSITORY = "repository"
    SERVICE = "service"
    CONTROLLER = "controller"
    VALIDATOR = "validator"
    MONITOR = "monitor"
    ENFORCER = "enforcer"

class CriticalPath(BaseModel):
    """Definition of a critical system path"""
    name: str
    domain: DomainBoundary
    dependencies: List[str]
    validation_rules: List[str]
    monitoring_hooks: List[str]
    deployment_requirements: List[str]

class ValidationRule(BaseModel):
    """System-wide validation rule"""
    name: str
    pattern: ArchitecturalPattern
    requirements: List[str]
    enforcement_level: str = Field(..., pattern="^(STRICT|WARN|INFO)$")

class SystemContract(BaseModel):
    """Core system architecture contract"""
    version: str = Field(default="1.0.0")
    domains: Dict = Field(default_factory=dict)
    patterns: Dict = Field(default_factory=dict)
    critical_paths: Dict = Field(default_factory=dict)
    validation_rules: Dict = Field(default_factory=dict)
    deployment_rules: List[str] = Field(default_factory=list)
    monitoring_requirements: List[str] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.now)
    dependencies: Dict[str, Dict[str, str]] = Field(default_factory=lambda: {
        "frontend": {
            "react-redux": "^8.1.3",
            "@reduxjs/toolkit": "^1.9.7",
            "@mui/material": "^5.15.0",
            "@testing-library/react-hooks": "^7.0.2",
            "typescript": "^4.9.5"
        }
    })

    def __init__(self, contract_data):
        super().__init__(**contract_data)

class ArchitectureContract:
    """System Architecture Contract Implementation"""
    def __init__(self, system_contract: SystemContract = None):
        self.system_contract = system_contract or SystemContract({})
        self.last_updated = self.system_contract.last_updated
        self._validate_contract()
        
    def _build_contract(self) -> SystemContract:
        """Build the core system contract"""
        return self.system_contract
    
    def _validate_contract(self):
        """Validate the contract structure"""
        if not self.system_contract:
            raise ValueError("Invalid contract structure")
    
    def get_domain_requirements(self, domain: str) -> DomainBoundary:
        """Get requirements for a specific domain"""
        return self.system_contract.domains.get(domain)
    
    def get_critical_path(self, path_name: str) -> List[str]:
        """Get a critical path definition"""
        return self.system_contract.critical_paths.get(path_name)
    
    def validate_component(self, domain: str, pattern: str) -> bool:
        """Validate a component against the contract"""
        if pattern not in self.system_contract.patterns:
            return False
        return True
    
    def get_deployment_requirements(self) -> List[str]:
        """Get all deployment requirements"""
        return self.system_contract.deployment_rules
    
    def get_monitoring_requirements(self) -> List[str]:
        """Get all monitoring requirements"""
        return self.system_contract.monitoring_requirements

# Global contract instance
_contract: ArchitectureContract = None

def get_contract() -> ArchitectureContract:
    """Get the global contract instance"""
    global _contract
    if _contract is None:
        _contract = ArchitectureContract()
    return _contract
