#!/bin/bash

# Production database backup script for MedMinder Pro
# This script performs automated backups of the production database
# and manages backup retention

set -e  # Exit on any error

# Configuration
NAMESPACE="production"
BACKUP_PATH="/var/lib/postgresql/backups"
RETENTION_DAYS=30
DB_NAME="medminder_prod"
DB_USER="medminder_prod"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_PATH"

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_PATH/backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Starting database backup..."

# Perform backup
kubectl exec -n "$NAMESPACE" deploy/postgres -- \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_PATH" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
echo "Verifying backup..."
if gzip -t "${BACKUP_FILE}.gz"; then
    echo "Backup verification successful"
else
    echo "Backup verification failed!"
    exit 1
fi

# Log backup details
echo "$(date): Backup completed successfully - ${BACKUP_FILE}.gz" >> "$BACKUP_PATH/backup.log"
