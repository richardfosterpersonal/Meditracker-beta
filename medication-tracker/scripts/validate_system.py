"""
System-wide Validation Runner
Last Updated: 2025-01-03T23:47:57+01:00
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

from app.infrastructure.validation.orchestrator import get_validator
from app.core.architecture_contract import get_contract

async def run_validation():
    """Run complete system validation"""
    validator = get_validator()
    contract = get_contract()
    
    print("\n=== Starting System-wide Validation ===\n")
    
    results = await validator.validate_system()
    
    # Format results
    formatted = {
        "timestamp": datetime.utcnow().isoformat(),
        "status": all(r.status for r in results.values()),
        "components": {
            name: {
                "status": result.status,
                "details": result.details,
                "timestamp": result.timestamp.isoformat()
            }
            for name, result in results.items()
        }
    }
    
    # Save results
    output_file = Path("validation_results.json")
    with output_file.open("w") as f:
        json.dump(formatted, f, indent=2)
    
    # Print summary
    print("\n=== Validation Results ===\n")
    for component, result in results.items():
        status = "✅" if result.status else "❌"
        print(f"{status} {component}")
        if not result.status:
            print("  Details:")
            for key, value in result.details.items():
                substatus = "✅" if value else "❌"
                print(f"    {substatus} {key}")
    
    print(f"\nOverall Status: {'✅ PASSED' if formatted['status'] else '❌ FAILED'}")
    print(f"\nDetailed results saved to: {output_file.absolute()}")

if __name__ == "__main__":
    asyncio.run(run_validation())
