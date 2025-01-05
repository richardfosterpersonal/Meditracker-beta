"""
Hourly Beta Validation Checker
Last Updated: 2024-12-25T23:17:41+01:00
Critical Path: Tools.Validation

Runs validation checks every hour and generates reports.
"""

import os
import sys
import time
import logging
from pathlib import Path
from datetime import datetime
import schedule

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from app.core.monitoring import BetaValidationMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/validation_checks.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ValidationScheduler:
    def __init__(self):
        self.project_root = str(Path(__file__).parent.parent.parent)
        self.monitor = BetaValidationMonitor(self.project_root)
        self.reports_dir = Path(self.project_root) / 'docs' / 'reports' / 'validation'
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
    def run_validation_check(self):
        """Run validation check and save report"""
        try:
            logger.info("Starting hourly validation check")
            
            # Generate report
            report = self.monitor.generate_validation_report()
            
            # Save report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = self.reports_dir / f"validation_status_{timestamp}.md"
            
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
                
            # Check beta readiness
            status = self.monitor.get_beta_readiness()
            if status['ready_for_beta']:
                logger.info("🎉 System is READY for beta!")
            else:
                logger.warning(
                    "⚠️ System is NOT ready for beta. "
                    f"Validation coverage: {status['validation_coverage']:.1f}%"
                )
                
            # Log missing validations
            missing = self.monitor.get_missing_validations()
            if missing:
                logger.warning("Missing validations:")
                for component, items in missing.items():
                    logger.warning(f"{component}: {', '.join(items)}")
                    
            logger.info(f"Report saved to: {report_file}")
            
        except Exception as e:
            logger.error(f"Error during validation check: {str(e)}")
            
def main():
    """Main entry point"""
    scheduler = ValidationScheduler()
    
    # Schedule hourly checks
    schedule.every().hour.at(":00").do(scheduler.run_validation_check)
    
    # Run initial check
    scheduler.run_validation_check()
    
    logger.info("Validation checker started. Running every hour.")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("Validation checker stopped by user")
        sys.exit(0)

if __name__ == '__main__':
    # Create logs directory
    Path('logs').mkdir(exist_ok=True)
    main()
