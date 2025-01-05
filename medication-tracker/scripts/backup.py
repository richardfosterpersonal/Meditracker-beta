#!/usr/bin/env python3
"""Database backup script for Medication Tracker."""

import os
import sys
import time
import logging
import subprocess
from datetime import datetime
from pathlib import Path
import boto3
import redis
import json
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BackupManager:
    def __init__(self, backup_dir: str = "backups"):
        self.backup_dir = Path(backup_dir)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def backup_postgres(self, db_name: str, host: str, port: int, user: str, password: str):
        """Backup PostgreSQL database."""
        try:
            backup_file = self.backup_dir / f"postgres_{db_name}_{self.timestamp}.sql"
            
            # Set environment variable for password
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            # Run pg_dump
            cmd = [
                "pg_dump",
                "-h", host,
                "-p", str(port),
                "-U", user,
                "-F", "c",  # Custom format
                "-b",  # Include large objects
                "-v",  # Verbose
                "-f", str(backup_file),
                db_name
            ]
            
            logger.info(f"Starting PostgreSQL backup to {backup_file}")
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("PostgreSQL backup completed successfully")
                return str(backup_file)
            else:
                logger.error(f"PostgreSQL backup failed: {result.stderr}")
                raise Exception(f"PostgreSQL backup failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Error during PostgreSQL backup: {str(e)}")
            raise

    def backup_redis(self, host: str, port: int, password: str = None):
        """Backup Redis data."""
        try:
            backup_file = self.backup_dir / f"redis_{self.timestamp}.json"
            
            # Connect to Redis
            redis_client = redis.Redis(
                host=host,
                port=port,
                password=password,
                decode_responses=True
            )
            
            # Get all keys
            keys = redis_client.keys('*')
            data = {}
            
            # Save key-value pairs
            for key in keys:
                key_type = redis_client.type(key)
                
                if key_type == 'string':
                    data[key] = {'type': 'string', 'value': redis_client.get(key)}
                elif key_type == 'hash':
                    data[key] = {'type': 'hash', 'value': redis_client.hgetall(key)}
                elif key_type == 'list':
                    data[key] = {'type': 'list', 'value': redis_client.lrange(key, 0, -1)}
                elif key_type == 'set':
                    data[key] = {'type': 'set', 'value': list(redis_client.smembers(key))}
                elif key_type == 'zset':
                    data[key] = {'type': 'zset', 'value': redis_client.zrange(key, 0, -1, withscores=True)}
            
            # Write to file
            with open(backup_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Redis backup completed successfully to {backup_file}")
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"Error during Redis backup: {str(e)}")
            raise

    def upload_to_s3(self, file_path: str, bucket: str, aws_access_key: str = None, aws_secret_key: str = None):
        """Upload backup file to S3."""
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            
            file_name = os.path.basename(file_path)
            s3_path = f"backups/{datetime.now().strftime('%Y/%m/%d')}/{file_name}"
            
            logger.info(f"Uploading {file_path} to S3 bucket {bucket}")
            s3_client.upload_file(file_path, bucket, s3_path)
            logger.info("Upload to S3 completed successfully")
            
        except Exception as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Database Backup Tool")
    parser.add_argument("--postgres", action="store_true", help="Backup PostgreSQL")
    parser.add_argument("--redis", action="store_true", help="Backup Redis")
    parser.add_argument("--upload-s3", action="store_true", help="Upload to S3")
    args = parser.parse_args()

    try:
        backup_manager = BackupManager()
        
        if args.postgres:
            # Get PostgreSQL credentials from environment
            postgres_backup = backup_manager.backup_postgres(
                db_name=os.getenv("POSTGRES_DB", "medication_tracker"),
                host=os.getenv("POSTGRES_SERVER", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                user=os.getenv("POSTGRES_USER", "postgres"),
                password=os.getenv("POSTGRES_PASSWORD")
            )
            
            if args.upload_s3:
                backup_manager.upload_to_s3(
                    postgres_backup,
                    bucket=os.getenv("S3_BACKUP_BUCKET"),
                    aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY")
                )
        
        if args.redis:
            # Get Redis credentials from environment
            redis_backup = backup_manager.backup_redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                password=os.getenv("REDIS_PASSWORD")
            )
            
            if args.upload_s3:
                backup_manager.upload_to_s3(
                    redis_backup,
                    bucket=os.getenv("S3_BACKUP_BUCKET"),
                    aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY")
                )
                
    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
