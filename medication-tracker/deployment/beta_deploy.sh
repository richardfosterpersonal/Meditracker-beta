#!/bin/bash
# Beta Deployment Script for Hostinger
# Last Updated: 2025-01-02T20:37:17+01:00

# Configuration
HOSTINGER_USERNAME="u374242363"
HOSTINGER_IP="46.202.198.2"
HOSTINGER_PORT="65002"
BETA_DOMAIN="beta.getmedminder.com"
MAIN_DOMAIN="getmedminder.com"
BACKEND_PORT=8000
FRONTEND_BUILD_DIR="frontend/build"
BACKEND_DIR="backend"
PUBLIC_HTML_PATH="/home/$HOSTINGER_USERNAME/domains/$MAIN_DOMAIN/public_html/beta"

# SSH command with correct port
SSH_CMD="ssh -p $HOSTINGER_PORT $HOSTINGER_USERNAME@$HOSTINGER_IP"
SCP_CMD="scp -P $HOSTINGER_PORT"
RSYNC_CMD="rsync -avz -e 'ssh -p $HOSTINGER_PORT'"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting beta deployment to Hostinger...${NC}"

# 1. Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
fi
cd ..

# 2. Run tests
echo -e "${YELLOW}Running tests...${NC}"
cd backend
python -m pytest tests/
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Deployment aborted.${NC}"
    exit 1
fi
cd ..

# 3. Deploy frontend to Hostinger
echo -e "${YELLOW}Deploying frontend...${NC}"
$RSYNC_CMD $FRONTEND_BUILD_DIR/ $HOSTINGER_USERNAME@$HOSTINGER_IP:$PUBLIC_HTML_PATH/

# 4. Deploy backend
echo -e "${YELLOW}Deploying backend...${NC}"
$RSYNC_CMD --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
    $BACKEND_DIR/ $HOSTINGER_USERNAME@$HOSTINGER_IP:/home/$HOSTINGER_USERNAME/medication-tracker-backend/

# 5. Deploy Nginx configuration
echo -e "${YELLOW}Deploying Nginx configuration...${NC}"
$SCP_CMD deployment/beta_hostinger.conf $HOSTINGER_USERNAME@$HOSTINGER_IP:/etc/nginx/conf.d/

# 6. Update environment variables
echo -e "${YELLOW}Updating environment variables...${NC}"
$SCP_CMD .env.beta $HOSTINGER_USERNAME@$HOSTINGER_IP:/home/$HOSTINGER_USERNAME/medication-tracker-backend/.env

# 7. Restart services
echo -e "${YELLOW}Restarting services...${NC}"
$SSH_CMD << 'ENDSSH'
    # Activate virtual environment and install dependencies
    cd ~/medication-tracker-backend
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Restart Gunicorn
    sudo systemctl restart medication-tracker-beta
    
    # Reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
ENDSSH

# 8. Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
curl -s https://$BETA_DOMAIN/beta/status > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Beta deployment successful!${NC}"
    echo -e "Beta site is now available at: https://$BETA_DOMAIN"
else
    echo -e "${RED}Beta deployment verification failed!${NC}"
    exit 1
fi
