import schedule
import time
import subprocess
import sys
import logging
from datetime import datetime
from pathlib import Path

class MaintenanceScheduler:
    def __init__(self):
        self.setup_logging()
        self.project_root = Path(__file__).parent

    def setup_logging(self):
        log_dir = Path("maintenance_logs")
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"maintenance_{datetime.now().strftime('%Y%m%d')}.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )

    def run_script(self, script_name):
        try:
            result = subprocess.run(
                [sys.executable, script_name],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logging.info(f"Successfully ran {script_name}")
                if result.stdout:
                    logging.info(f"Output: {result.stdout}")
            else:
                logging.error(f"Error running {script_name}: {result.stderr}")
        except Exception as e:
            logging.error(f"Failed to run {script_name}: {str(e)}")

    def daily_maintenance(self):
        logging.info("Running daily maintenance tasks...")
        
        # Run cleanup script
        self.run_script("cleanup.py")
        
        # Run benchmark
        self.run_script("benchmark.py")
        
        logging.info("Daily maintenance completed")

    def weekly_maintenance(self):
        logging.info("Running weekly maintenance tasks...")
        
        # Git optimization
        try:
            subprocess.run(["git", "gc", "--aggressive", "--prune=now"], 
                         cwd=self.project_root, check=True)
            logging.info("Git repository optimized")
        except Exception as e:
            logging.error(f"Git optimization failed: {str(e)}")

        # Run more intensive cleanup
        self.run_script("cleanup.py")
        
        logging.info("Weekly maintenance completed")

    def monthly_maintenance(self):
        logging.info("Running monthly maintenance tasks...")
        
        # Database optimization
        try:
            # Vacuum SQLite database
            db_path = self.project_root / "backend" / "instance" / "medication_tracker.db"
            if db_path.exists():
                subprocess.run(["sqlite3", str(db_path), "VACUUM;"], check=True)
                logging.info("Database optimized")
        except Exception as e:
            logging.error(f"Database optimization failed: {str(e)}")

        # Run full cleanup
        self.run_script("cleanup.py")
        
        logging.info("Monthly maintenance completed")

    def start_scheduler(self):
        # Daily tasks - run at 3 AM
        schedule.every().day.at("03:00").do(self.daily_maintenance)
        
        # Weekly tasks - run at 4 AM on Sundays
        schedule.every().sunday.at("04:00").do(self.weekly_maintenance)
        
        # Monthly tasks - run at 5 AM on the first day of each month
        schedule.every().month.at("05:00").do(self.monthly_maintenance)

        logging.info("Maintenance scheduler started")
        print("\n🔄 Maintenance scheduler is running...")
        print("Press Ctrl+C to stop")

        try:
            while True:
                schedule.run_pending()
                time.sleep(60)
        except KeyboardInterrupt:
            logging.info("Maintenance scheduler stopped by user")
            print("\n👋 Maintenance scheduler stopped")

if __name__ == "__main__":
    scheduler = MaintenanceScheduler()
    scheduler.start_scheduler()
