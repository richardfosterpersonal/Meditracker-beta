#!/bin/bash

# Production deployment script for MedMinder Pro
# This script handles the deployment of the application to production
# including database migrations and health checks

set -e  # Exit on any error

# Configuration
APP_NAME="medminder-pro"
NAMESPACE="production"
DB_BACKUP_PATH="./backups/$(date +%Y%m%d_%H%M%S)"

echo "Starting production deployment for $APP_NAME..."

# 1. Database Backup
echo "Creating database backup..."
mkdir -p "$DB_BACKUP_PATH"
kubectl exec -n "$NAMESPACE" deploy/postgres -- pg_dump -U postgres medication_tracker > "$DB_BACKUP_PATH/pre_deploy_backup.sql"

# 2. Run Database Migrations
echo "Running database migrations..."
npx prisma migrate deploy

# 3. Deploy Kubernetes Resources
echo "Deploying Kubernetes resources..."

# Apply secrets first
kubectl apply -f kubernetes/production/secrets.yaml

# Apply core resources
kubectl apply -f kubernetes/production/app-deployment.yaml
kubectl apply -f kubernetes/production/app-service.yaml
kubectl apply -f kubernetes/production/ingress.yaml

# 4. Wait for Deployment
echo "Waiting for deployment to complete..."
kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=300s

# 5. Verify Health
echo "Verifying application health..."
HEALTH_CHECK_URL="https://api.medminder.pro/health"
MAX_RETRIES=10
RETRY_INTERVAL=30

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s "$HEALTH_CHECK_URL" | grep -q '"status":"healthy"'; then
        echo "Application is healthy!"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Health check failed after $MAX_RETRIES attempts"
        exit 1
    fi
    
    echo "Health check attempt $i failed, retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
done

# 6. Run Smoke Tests
echo "Running smoke tests..."
npm run test:smoke

# 7. Monitor Deployment
echo "Monitoring deployment..."
kubectl logs -n "$NAMESPACE" -l app="$APP_NAME" -f &
PID=$!

# Wait for a minute to catch any immediate issues
sleep 60
kill $PID

echo "Deployment completed successfully!"
echo "Please monitor Sentry and metrics dashboards for any issues."
