"""
Beta Launch Runner
Critical Path: BETA-LAUNCH-RUNNER
Last Updated: 2025-01-02T13:49:32+01:00
"""

import os
import sys
from pathlib import Path

# Add backend to Python path
repo_root = Path(__file__).parent.parent
sys.path.append(str(repo_root))

from backend.app.core.unified_validation_framework import UnifiedValidationFramework
from backend.app.exceptions import ValidationError

def main():
    """Run beta launch with proper Python path"""
    validation_framework = UnifiedValidationFramework()
    
    try:
        print("Starting beta launch sequence...")
        
        # Run unified validation
        validation_framework.validate({
            'stage': 'beta_launch',
            'component': 'launch_runner',
            'validation_type': 'launch'
        })
        
        print("\nBeta launch completed successfully!")
        return 0
        
    except ValidationError as e:
        print(f"\nBeta launch failed: {str(e)}")
        return 1
        
    except Exception as e:
        print(f"\nUnexpected error during beta launch: {str(e)}")
        return 2
        
if __name__ == '__main__':
    sys.exit(main())
