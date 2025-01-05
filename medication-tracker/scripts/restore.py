#!/usr/bin/env python3
"""Database restore script for Medication Tracker."""

import os
import sys
import logging
import subprocess
import json
import redis
import boto3
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RestoreManager:
    def __init__(self):
        pass
        
    def restore_postgres(self, backup_file: str, db_name: str, host: str, port: int, user: str, password: str):
        """Restore PostgreSQL database from backup."""
        try:
            # Set environment variable for password
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            # First, terminate existing connections
            terminate_cmd = [
                "psql",
                "-h", host,
                "-p", str(port),
                "-U", user,
                "-d", "postgres",
                "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' AND pid <> pg_backend_pid();"
            ]
            
            logger.info("Terminating existing database connections")
            subprocess.run(terminate_cmd, env=env, check=True)
            
            # Drop and recreate database
            drop_cmd = [
                "dropdb",
                "-h", host,
                "-p", str(port),
                "-U", user,
                "--if-exists",
                db_name
            ]
            
            create_cmd = [
                "createdb",
                "-h", host,
                "-p", str(port),
                "-U", user,
                db_name
            ]
            
            logger.info(f"Dropping database {db_name}")
            subprocess.run(drop_cmd, env=env, check=True)
            
            logger.info(f"Creating database {db_name}")
            subprocess.run(create_cmd, env=env, check=True)
            
            # Restore from backup
            restore_cmd = [
                "pg_restore",
                "-h", host,
                "-p", str(port),
                "-U", user,
                "-d", db_name,
                "-v",
                backup_file
            ]
            
            logger.info(f"Restoring from backup file {backup_file}")
            result = subprocess.run(restore_cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("PostgreSQL restore completed successfully")
            else:
                logger.error(f"PostgreSQL restore failed: {result.stderr}")
                raise Exception(f"PostgreSQL restore failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Error during PostgreSQL restore: {str(e)}")
            raise

    def restore_redis(self, backup_file: str, host: str, port: int, password: str = None):
        """Restore Redis data from backup."""
        try:
            # Connect to Redis
            redis_client = redis.Redis(
                host=host,
                port=port,
                password=password,
                decode_responses=True
            )
            
            # Clear existing data
            logger.info("Clearing existing Redis data")
            redis_client.flushall()
            
            # Load backup data
            logger.info(f"Loading data from backup file {backup_file}")
            with open(backup_file, 'r') as f:
                data = json.load(f)
            
            # Restore data
            for key, item in data.items():
                key_type = item['type']
                value = item['value']
                
                if key_type == 'string':
                    redis_client.set(key, value)
                elif key_type == 'hash':
                    redis_client.hset(key, mapping=value)
                elif key_type == 'list':
                    redis_client.rpush(key, *value)
                elif key_type == 'set':
                    if value:  # Only add if there are values
                        redis_client.sadd(key, *value)
                elif key_type == 'zset':
                    for member, score in value:
                        redis_client.zadd(key, {member: score})
            
            logger.info("Redis restore completed successfully")
            
        except Exception as e:
            logger.error(f"Error during Redis restore: {str(e)}")
            raise

    def download_from_s3(self, bucket: str, s3_path: str, local_path: str, aws_access_key: str = None, aws_secret_key: str = None):
        """Download backup file from S3."""
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            
            logger.info(f"Downloading {s3_path} from S3 bucket {bucket}")
            s3_client.download_file(bucket, s3_path, local_path)
            logger.info("Download from S3 completed successfully")
            
        except Exception as e:
            logger.error(f"Error downloading from S3: {str(e)}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Database Restore Tool")
    parser.add_argument("--postgres", help="PostgreSQL backup file to restore")
    parser.add_argument("--redis", help="Redis backup file to restore")
    parser.add_argument("--s3-path", help="S3 path to download backup from")
    args = parser.parse_args()

    try:
        restore_manager = RestoreManager()
        
        if args.s3_path:
            # Download from S3 first
            local_path = f"backups/downloaded_{os.path.basename(args.s3_path)}"
            restore_manager.download_from_s3(
                bucket=os.getenv("S3_BACKUP_BUCKET"),
                s3_path=args.s3_path,
                local_path=local_path,
                aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            )
            backup_file = local_path
        else:
            backup_file = args.postgres or args.redis

        if args.postgres:
            restore_manager.restore_postgres(
                backup_file=backup_file,
                db_name=os.getenv("POSTGRES_DB", "medication_tracker"),
                host=os.getenv("POSTGRES_SERVER", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                user=os.getenv("POSTGRES_USER", "postgres"),
                password=os.getenv("POSTGRES_PASSWORD")
            )
        
        if args.redis:
            restore_manager.restore_redis(
                backup_file=backup_file,
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                password=os.getenv("REDIS_PASSWORD")
            )
                
    except Exception as e:
        logger.error(f"Restore failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
