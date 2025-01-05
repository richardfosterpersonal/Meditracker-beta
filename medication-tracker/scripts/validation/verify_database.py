"""
Database Verification Script
Last Updated: 2024-12-25T19:37:43+01:00
Status: VALIDATED
Reference: MASTER_CRITICAL_PATH.md
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

class DatabaseVerifier:
    """Verifies database configuration and state."""
    
    def __init__(self, log_dir: str):
        """Initialize the verifier with logging directory."""
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging."""
        log_file = self.log_dir / f"db_verification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def verify_connection(self, db_url: str) -> bool:
        """Verify database connection."""
        try:
            conn = psycopg2.connect(db_url)
            conn.close()
            self.logger.info("Database connection successful")
            return True
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            return False

    def verify_tables(self, db_url: str) -> bool:
        """Verify required tables exist."""
        required_tables = {
            'users',
            'medications',
            'schedules',
            'reminders'
        }
        
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            
            existing_tables = {row[0] for row in cur.fetchall()}
            missing_tables = required_tables - existing_tables
            
            if missing_tables:
                self.logger.error(f"Missing tables: {missing_tables}")
                return False
            
            self.logger.info("All required tables exist")
            return True
        except Exception as e:
            self.logger.error(f"Table verification failed: {e}")
            return False
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

    def verify_schema(self, db_url: str) -> bool:
        """Verify schema integrity."""
        required_columns = {
            'medications': {'id', 'name', 'dosage', 'schedule_id'},
            'schedules': {'id', 'user_id', 'time', 'frequency'},
            'reminders': {'id', 'medication_id', 'time', 'sent'},
            'users': {'id', 'email', 'password_hash'}
        }
        
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            for table, required_cols in required_columns.items():
                cur.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}'
                """)
                
                existing_cols = {row[0] for row in cur.fetchall()}
                missing_cols = required_cols - existing_cols
                
                if missing_cols:
                    self.logger.error(f"Missing columns in {table}: {missing_cols}")
                    return False
            
            self.logger.info("Schema verification successful")
            return True
        except Exception as e:
            self.logger.error(f"Schema verification failed: {e}")
            return False
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

    def verify_indexes(self, db_url: str) -> bool:
        """Verify required indexes exist."""
        required_indexes = {
            'medications': {'medications_pkey', 'medications_schedule_id_idx'},
            'schedules': {'schedules_pkey', 'schedules_user_id_idx'},
            'reminders': {'reminders_pkey', 'reminders_medication_id_idx'},
            'users': {'users_pkey', 'users_email_idx'}
        }
        
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            for table, required_idx in required_indexes.items():
                cur.execute(f"""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = '{table}'
                """)
                
                existing_indexes = {row[0] for row in cur.fetchall()}
                missing_indexes = required_idx - existing_indexes
                
                if missing_indexes:
                    self.logger.error(f"Missing indexes in {table}: {missing_indexes}")
                    return False
            
            self.logger.info("Index verification successful")
            return True
        except Exception as e:
            self.logger.error(f"Index verification failed: {e}")
            return False
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

    def generate_verification_report(self) -> str:
        """Generate a verification report."""
        report_file = self.log_dir / f"verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_file, 'w') as f:
            f.write("# Database Verification Report\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            # Add verification results from log file
            log_file = max(self.log_dir.glob("db_verification_*.log"))
            with open(log_file) as log:
                f.write("## Verification Results\n\n")
                for line in log:
                    if 'INFO' in line or 'ERROR' in line:
                        f.write(f"- {line.split(' - ')[-1]}")
            
            f.write("\n## Recommendations\n\n")
            f.write("1. Regularly verify database integrity\n")
            f.write("2. Maintain backup schedule\n")
            f.write("3. Monitor connection pool efficiency\n")
            f.write("4. Keep schema documentation updated\n")
        
        return str(report_file)

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Verify database configuration')
    parser.add_argument('--db-url', required=True,
                      help='Database connection URL')
    parser.add_argument('--log-dir', default='./verification_logs',
                      help='Directory for verification logs')
    
    args = parser.parse_args()
    
    verifier = DatabaseVerifier(args.log_dir)
    success = all([
        verifier.verify_connection(args.db_url),
        verifier.verify_tables(args.db_url),
        verifier.verify_schema(args.db_url),
        verifier.verify_indexes(args.db_url)
    ])
    
    report_file = verifier.generate_verification_report()
    print(f"Verification report saved to: {report_file}")
    
    if success:
        print("Database verification successful")
        exit(0)
    else:
        print("Database verification failed. Check report for details.")
        exit(1)

if __name__ == '__main__':
    main()
