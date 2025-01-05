"""
Database Connection Test Script
Last Updated: 2024-12-25T19:55:04+01:00
Status: VALIDATED
Reference: MASTER_CRITICAL_PATH.md
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
import psycopg2
from psycopg2.pool import SimpleConnectionPool

class DatabaseConnectionValidator:
    """Validates database connection for beta requirements."""
    
    def __init__(self, log_dir: str):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging for validation chain."""
        log_file = self.log_dir / f"db_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def test_basic_connection(self, db_url: str) -> bool:
        """Test basic database connectivity."""
        try:
            conn = psycopg2.connect(db_url)
            conn.close()
            self.logger.info("Basic connection test: SUCCESS")
            return True
        except Exception as e:
            self.logger.error(f"Basic connection test failed: {e}")
            return False

    def test_connection_pool(self, db_url: str, pool_size: int) -> bool:
        """Test connection pool functionality."""
        try:
            pool = SimpleConnectionPool(1, pool_size, db_url)
            connections = [pool.getconn() for _ in range(pool_size)]
            for conn in connections:
                pool.putconn(conn)
            pool.closeall()
            self.logger.info("Connection pool test: SUCCESS")
            return True
        except Exception as e:
            self.logger.error(f"Connection pool test failed: {e}")
            return False

    def test_basic_query(self, db_url: str) -> bool:
        """Test basic query execution."""
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            conn.close()
            self.logger.info("Basic query test: SUCCESS")
            return True
        except Exception as e:
            self.logger.error(f"Basic query test failed: {e}")
            return False

    def generate_validation_report(self) -> str:
        """Generate validation report for chain documentation."""
        report_file = self.log_dir / f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_file, 'w') as f:
            f.write("# Database Connection Validation Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            # Add validation results from log file
            log_file = max(self.log_dir.glob("db_validation_*.log"))
            with open(log_file) as log:
                f.write("## Test Results\n\n")
                for line in log:
                    if 'INFO' in line or 'ERROR' in line:
                        f.write(f"- {line.split(' - ')[-1]}")
        
        return str(report_file)

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Validate database connection')
    parser.add_argument('--db-url', required=True,
                      help='Database connection URL')
    parser.add_argument('--pool-size', type=int, default=5,
                      help='Connection pool size')
    parser.add_argument('--log-dir', default='./validation_logs',
                      help='Directory for validation logs')
    
    args = parser.parse_args()
    
    validator = DatabaseConnectionValidator(args.log_dir)
    success = all([
        validator.test_basic_connection(args.db_url),
        validator.test_connection_pool(args.db_url, args.pool_size),
        validator.test_basic_query(args.db_url)
    ])
    
    report_file = validator.generate_validation_report()
    print(f"Validation report saved to: {report_file}")
    
    if success:
        print("Database connection validation successful")
        exit(0)
    else:
        print("Database connection validation failed. Check report for details.")
        exit(1)

if __name__ == '__main__':
    main()
