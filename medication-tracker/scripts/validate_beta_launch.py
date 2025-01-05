#!/usr/bin/env python3
"""
Beta Launch Validation Script
Last Updated: 2025-01-01T22:16:22+01:00
"""

import sys
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

def validate_beta_launch():
    """Run all pre-validation checks and report status"""
    print("\nStarting Beta Launch Validation")
    print("=" * 50)
    
    from backend.app.core.beta_launch_manager import BetaLaunchManager, BetaLaunchError
    
    try:
        # Create launch manager
        manager = BetaLaunchManager.create_launch_manager()
        
        # Run launch sequence
        manager.launch()
        
        # Get final state
        state = manager.get_launch_state()
        
        if state["status"] == "launched":
            print("\n[SUCCESS] Beta launch validation successful!")
            print(f"Launch time: {state['launch_time']}")
            return True
            
        print("\n[ERROR] Beta launch validation failed!")
        print("Launch state:")
        print(f"  * Status: {state['status']}")
        print(f"  * Errors: {state['errors']}")
        return False
        
    except BetaLaunchError as e:
        print(f"\n[ERROR] Beta launch validation failed: {str(e)}")
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    sys.exit(0 if validate_beta_launch() else 1)
