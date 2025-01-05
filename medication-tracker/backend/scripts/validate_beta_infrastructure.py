#!/usr/bin/env python3
"""
Beta Infrastructure Validation Script
Validates and reports on the complete beta testing infrastructure
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
import sys
import os
from dotenv import load_dotenv

# Load validation environment
env_file = Path(__file__).parent.parent / '.env.validation'
load_dotenv(env_file)

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from app.validation.validation_orchestrator import ValidationOrchestrator
from app.core.logging import beta_logger

async def validate_beta_infrastructure():
    """Runs complete validation of beta testing infrastructure"""
    validator = ValidationOrchestrator()
    
    # Components to validate
    components = [
        'beta_testing',
        'beta_onboarding',
        'beta_monitoring',
        'beta_feedback'
    ]
    
    validation_results = {}
    
    for component in components:
        beta_logger.info(f"Validating {component}...")
        state = await validator.pre_validate_state(component)
        validation_results[component] = state
    
    # Generate report
    report = {
        'timestamp': datetime.now().isoformat(),
        'results': validation_results,
        'summary': {
            'total_components': len(components),
            'validated_components': sum(1 for c in validation_results.values() if c['validation_status']),
            'needs_attention': [
                c for c, s in validation_results.items() 
                if not s['validation_status']
            ]
        }
    }
    
    # Save report
    report_path = project_root / 'reports' / 'beta_validation'
    report_path.mkdir(parents=True, exist_ok=True)
    
    report_file = report_path / f'validation_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
        
    return report

def print_report(report):
    """Prints formatted validation report"""
    print("\n=== Beta Infrastructure Validation Report ===")
    print(f"Generated: {report['timestamp']}")
    print(f"\nComponents Validated: {report['summary']['validated_components']}/{report['summary']['total_components']}")
    
    if report['summary']['needs_attention']:
        print("\nComponents Needing Attention:")
        for component in report['summary']['needs_attention']:
            print(f"- {component}")
            state = report['results'][component]
            if state['existing_implementation']:
                print("  Existing files:")
                for file, details in state['existing_implementation'].items():
                    print(f"    - {file}")
                    print(f"      Purpose: {details['purpose'][:100]}...")
            else:
                print("  No existing implementation found")
    
    print("\nDetailed Results:")
    for component, state in report['results'].items():
        print(f"\n{component}:")
        print(f"  Status: {state['current_state'].get('status', 'unknown')}")
        print(f"  Last Validated: {state['current_state'].get('last_validation', 'never')}")
        if state['dependencies']:
            print("  Dependencies:")
            for dep in state['dependencies']:
                print(f"    - {dep['name']} ({dep['type']})")

async def main():
    """Main entry point"""
    try:
        report = await validate_beta_infrastructure()
        print_report(report)
        return report
    except Exception as e:
        beta_logger.error(f"Validation failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
