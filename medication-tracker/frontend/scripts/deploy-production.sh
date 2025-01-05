#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting production deployment...${NC}"

# 1. Build the application
echo "Building application..."
npm run build

# 2. Run tests
echo "Running tests..."
npm run test:ci

# 3. Generate service worker
echo "Generating service worker..."
npm run generate-sw

# 4. Run security checks
echo "Running security audit..."
npm audit --production

# 5. Run bundle analysis
echo "Analyzing bundle size..."
npm run analyze

# 6. Optimize assets
echo "Optimizing assets..."
npm run optimize

# 7. Deploy to CDN
echo "Deploying to CDN..."
aws s3 sync build/ s3://$CDN_BUCKET --delete

# 8. Invalidate CDN cache
echo "Invalidating CDN cache..."
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"

# 9. Update SSL certificates
echo "Checking SSL certificates..."
certbot renew

# 10. Deploy nginx configuration
echo "Deploying nginx configuration..."
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp nginx/security-headers.conf /etc/nginx/security-headers.conf
sudo nginx -t && sudo systemctl reload nginx

# 11. Update environment variables
echo "Updating environment variables..."
aws ssm put-parameter --name "/prod/medication-tracker/env" --type "SecureString" --value "$(cat .env.production)" --overwrite

# 12. Run database migrations
echo "Running database migrations..."
npm run migrate:production

# 13. Backup database
echo "Creating database backup..."
npm run backup:production

# 14. Monitor deployment
echo "Monitoring deployment..."
npm run monitor:deployment

# 15. Run health checks
echo "Running health checks..."
./scripts/health-check.sh

# 16. Update documentation
echo "Updating documentation..."
npm run docs:generate

echo -e "${GREEN}Deployment completed successfully!${NC}"

# Print deployment summary
echo "
Deployment Summary:
------------------
- Environment: Production
- Version: $(node -p "require('./package.json').version")
- Timestamp: $(date)
- Build ID: $(git rev-parse --short HEAD)
- CDN URL: $REACT_APP_CDN_URL
- API URL: $REACT_APP_API_URL
"

# Send deployment notification
curl -X POST $SLACK_WEBHOOK_URL -H "Content-Type: application/json" -d '{
  "text": "Production deployment completed successfully!\nVersion: '"$(node -p "require('./package.json').version")"'\nBuild: '"$(git rev-parse --short HEAD)"'"
}'
