#!/bin/bash
# Package Application for Deployment
# Last Updated: 2024-12-29T16:23:33+01:00

echo "Packaging application for deployment..."

# Create deployment directory
mkdir -p deploy/beta
cd deploy/beta

# Copy application files
cp -r ../../backend/app ./
cp ../../backend/requirements.txt ./
cp ../../backend/passenger_wsgi.py ./

# Create .env file template
cat > .env.template << 'EOL'
ENVIRONMENT=production
DOMAIN=beta.getmedminder.com
SECRET_KEY=replace_with_secure_key
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=beta@getmedminder.com
SMTP_PASSWORD=your_email_password
EOL

# Create deployment instructions
cat > README.md << 'EOL'
# Beta Deployment Instructions

1. SSH into server:
   ```bash
   ssh root@147.93.40.164
   ```

2. Upload files:
   ```bash
   scp -r * root@147.93.40.164:/var/www/beta.getmedminder.com/
   ```

3. Run setup script:
   ```bash
   chmod +x setup_beta.sh
   ./setup_beta.sh
   ```

4. Configure environment:
   ```bash
   cp .env.template .env
   nano .env  # Edit with actual values
   ```

5. Check status:
   ```bash
   systemctl status medminder-beta
   ```
EOL

echo "Package created in deploy/beta/"
