"""
Validation Hook Runner
Last Updated: 2024-12-25T20:40:07+01:00
Status: CRITICAL
Reference: ../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md

This script runs the validation hook system:
1. Validates all references
2. Updates outdated references
3. Generates validation report
"""

import os
import logging
from pathlib import Path
from validation_hook import ValidationHook

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('validation.log'),
            logging.StreamHandler()
        ]
    )

def main():
    """Run validation hook"""
    setup_logging()
    logger = logging.getLogger(__name__)
    
    try:
        # Get project root
        project_root = Path(__file__).parent.parent.parent
        
        # Initialize validation hook
        hook = ValidationHook(project_root)
        
        # Run validation
        success = hook.run_validation_hook()
        
        if success:
            logger.info("Validation completed successfully")
        else:
            logger.error("Validation failed")
            exit(1)
            
        # Start watching for changes
        observer = hook.watch_critical_path()
        
        try:
            while True:
                pass
        except KeyboardInterrupt:
            observer.stop()
            observer.join()
            
    except Exception as e:
        logger.error(f"Error running validation: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
