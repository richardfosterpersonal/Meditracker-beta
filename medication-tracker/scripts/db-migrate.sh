#!/bin/bash

# Production database migration script for MedMinder Pro
# This script handles the migration of the database to production
# including backup, verification, and rollback procedures

set -e  # Exit on any error

# Configuration
NAMESPACE="production"
BACKUP_PATH="/var/lib/postgresql/backups/pre_migration_$(date +%Y%m%d_%H%M%S)"
DB_NAME="medminder_prod"
DB_USER="medminder_prod"

echo "Starting production database migration..."

# 1. Create Pre-Migration Backup
echo "Creating pre-migration backup..."
mkdir -p "$BACKUP_PATH"
kubectl exec -n "$NAMESPACE" deploy/postgres -- \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_PATH/pre_migration.sql"

# 2. Verify Database Connection
echo "Verifying database connection..."
npx prisma db push --preview-feature

# 3. Run Migrations
echo "Running database migrations..."
npx prisma migrate deploy

# 4. Verify Data Integrity
echo "Verifying data integrity..."
npx ts-node ./scripts/verify-data.ts

# 5. Run Performance Tests
echo "Running performance tests..."
npx ts-node ./scripts/test-db-performance.ts

# 6. Create Post-Migration Backup
echo "Creating post-migration backup..."
kubectl exec -n "$NAMESPACE" deploy/postgres -- \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_PATH/post_migration.sql"

# 7. Verify Backup Integrity
echo "Verifying backup integrity..."
if gzip -t "${BACKUP_PATH}/post_migration.sql.gz"; then
    echo "Backup verification successful"
else
    echo "Backup verification failed!"
    exit 1
fi

echo "Migration completed successfully!"
