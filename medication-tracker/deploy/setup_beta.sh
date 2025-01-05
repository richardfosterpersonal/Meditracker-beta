#!/bin/bash
# Beta Deployment Script
# Last Updated: 2024-12-29T16:23:33+01:00

echo "Setting up beta.getmedminder.com..."

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y python3.9 python3.9-venv python3-pip nginx certbot python3-certbot-nginx ufw

# Configure firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# Create application directory
mkdir -p /var/www/beta.getmedminder.com
cd /var/www/beta.getmedminder.com

# Set up Python environment
python3.9 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Create Nginx configuration
cat > /etc/nginx/sites-available/beta.getmedminder.com << 'EOL'
server {
    listen 80;
    server_name beta.getmedminder.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Enable the site
ln -s /etc/nginx/sites-available/beta.getmedminder.com /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Set up SSL
certbot --nginx -d beta.getmedminder.com --non-interactive --agree-tos --email admin@getmedminder.com

# Create systemd service
cat > /etc/systemd/system/medminder-beta.service << 'EOL'
[Unit]
Description=MedMinder Beta
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/beta.getmedminder.com
Environment="PATH=/var/www/beta.getmedminder.com/venv/bin"
ExecStart=/var/www/beta.getmedminder.com/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
EOL

# Start and enable the service
systemctl start medminder-beta
systemctl enable medminder-beta

echo "Setup complete! Check status with: systemctl status medminder-beta"
