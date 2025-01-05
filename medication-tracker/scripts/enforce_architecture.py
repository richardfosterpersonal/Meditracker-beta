"""
Architecture Contract Enforcement Script
Last Updated: 2025-01-04T21:13:08+01:00
"""

import asyncio
import json
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.insert(0, project_root)

from backend.app.core.architecture_contract import (
    ArchitectureContract,
    DomainBoundary,
    ValidationRule,
    SystemContract
)
from backend.app.infrastructure.validation.orchestrator import SystemValidator

class ArchitectureEnforcer:
    def __init__(self):
        self.contract = ArchitectureContract()
        self.validator = SystemValidator()
        self.validation_results = {}
        
    async def enforce_all(self) -> bool:
        """Enforce all architectural rules"""
        results = await self.validator.validate_system()
        
        # Check all validation results
        for component, result in results.items():
            if not result.status:
                print(f"Validation failed for {component}: {result.details}")
                return False
                
        # Validate beta checklist
        if not await self._check_beta_readiness():
            return False
            
        return True
        
    async def _check_beta_readiness(self) -> bool:
        """Check beta deployment readiness"""
        checklist_path = Path(__file__).parent.parent / "beta_checklist.json"
        with open(checklist_path) as f:
            checklist = json.load(f)
            
        if not checklist.get("complete", False):
            print("Beta checklist is not complete")
            return False
            
        for check, data in checklist.get("checks", {}).items():
            if data.get("status") != "ready" or not data.get("validated", False):
                print(f"Beta check failed for {check}")
                return False
                
        return True

async def main():
    print("Starting architecture enforcement...")
    enforcer = ArchitectureEnforcer()
    
    try:
        if await enforcer.enforce_all():
            print("All architectural validations passed!")
            return True
        else:
            print("Architecture validation failed!")
            return False
    except Exception as e:
        print(f"Error during architecture validation: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(main())
