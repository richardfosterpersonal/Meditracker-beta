#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting production build process..."

# Clean build directory
echo "Cleaning build directory..."
rm -rf build/
mkdir -p build/

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run tests
echo "Running tests..."
npm run test:ci

# Run linting
echo "Running linting..."
npm run lint

# Build application
echo "Building application..."
npm run build:production

# Optimize production build
echo "Optimizing production build..."
npm run optimize

# Generate service worker
echo "Generating service worker..."
npm run generate-sw

# Run security audit
echo "Running security audit..."
npm audit --production

# Run health check
echo "Running health check..."
npm run health-check

# Create build info file
echo "Creating build info file..."
cat > build/build-info.json << EOF
{
  "version": "$(node -p "require('./package.json').version")",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)",
  "commit": "$(git rev-parse HEAD)",
  "branch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOF

# Check build size
echo "Checking build size..."
BUILD_SIZE=$(du -sh build/ | cut -f1)
echo -e "${GREEN}Build size: $BUILD_SIZE${NC}"

# Verify critical files
echo "Verifying critical files..."
CRITICAL_FILES=(
  "build/index.html"
  "build/service-worker.js"
  "build/static/js/main.*.js"
  "build/static/css/main.*.css"
)

for file in "${CRITICAL_FILES[@]}"; do
  if ls $file 1> /dev/null 2>&1; then
    echo -e "${GREEN}✓ Found $(basename $file)${NC}"
  else
    echo -e "${RED}✗ Missing $(basename $file)${NC}"
    exit 1
  fi
done

echo -e "\n${GREEN}Production build completed successfully!${NC}"
echo "Run 'npm run deploy:production' to deploy to production."
