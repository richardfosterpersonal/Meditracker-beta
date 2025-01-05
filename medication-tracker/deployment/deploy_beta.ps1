# Beta Deployment PowerShell Script
# Last Updated: 2025-01-02T20:56:50+01:00

$ErrorActionPreference = "Stop"

# Configuration
$HOSTINGER_USERNAME = "u374242363"
$HOSTINGER_IP = "46.202.198.2"
$HOSTINGER_PORT = "65002"
$BETA_DOMAIN = "beta.getmedminder.com"
$MAIN_DOMAIN = "getmedminder.com"
$PUBLIC_HTML_PATH = "/home/$HOSTINGER_USERNAME/domains/$MAIN_DOMAIN/public_html/beta"

function Test-Command {
    param ($command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try { if (Get-Command $command) { return $true } }
    catch { return $false }
    finally { $ErrorActionPreference = $oldPreference }
}

function Write-Status {
    param($message, $type = "INFO")
    $color = switch ($type) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$type] $message" -ForegroundColor $color
}

# Check for required tools
Write-Status "Checking required tools..."
$hasOpenSSH = Test-Command "ssh"
$hasPuTTY = Test-Command "putty"

if (-not $hasOpenSSH -and -not $hasPuTTY) {
    Write-Status "Neither OpenSSH nor PuTTY found. Installing PuTTY..." "WARNING"
    winget install -e --id PuTTY.PuTTY --accept-source-agreements
}

# Test connection
Write-Status "Testing connection to Hostinger..."
$testConnection = Test-NetConnection -ComputerName $HOSTINGER_IP -Port $HOSTINGER_PORT
if (-not $testConnection.TcpTestSucceeded) {
    Write-Status "Failed to connect to $HOSTINGER_IP:$HOSTINGER_PORT" "ERROR"
    exit 1
}

# Create deployment directories
Write-Status "Creating deployment directories..."
$deployCmd = "mkdir -p $PUBLIC_HTML_PATH ~/medication-tracker-backend ~/logs/{validation,security,monitoring,alerts}"
ssh -p $HOSTINGER_PORT "$HOSTINGER_USERNAME@$HOSTINGER_IP" $deployCmd

# Deploy frontend
Write-Status "Building and deploying frontend..."
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Status "Frontend build failed!" "ERROR"
    exit 1
}
Set-Location ..

# Use rsync or scp based on availability
if (Test-Command "rsync") {
    rsync -avz -e "ssh -p $HOSTINGER_PORT" frontend/build/ "$HOSTINGER_USERNAME@$HOSTINGER_IP:$PUBLIC_HTML_PATH/"
} else {
    scp -P $HOSTINGER_PORT -r frontend/build/* "$HOSTINGER_USERNAME@$HOSTINGER_IP:$PUBLIC_HTML_PATH/"
}

# Deploy backend
Write-Status "Deploying backend..."
if (Test-Command "rsync") {
    rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' -e "ssh -p $HOSTINGER_PORT" `
        backend/ "$HOSTINGER_USERNAME@$HOSTINGER_IP:/home/$HOSTINGER_USERNAME/medication-tracker-backend/"
} else {
    scp -P $HOSTINGER_PORT -r backend/* "$HOSTINGER_USERNAME@$HOSTINGER_IP:/home/$HOSTINGER_USERNAME/medication-tracker-backend/"
}

# Deploy configuration
Write-Status "Deploying configuration files..."
scp -P $HOSTINGER_PORT deployment/beta_hostinger.conf "$HOSTINGER_USERNAME@$HOSTINGER_IP:/etc/nginx/conf.d/"
scp -P $HOSTINGER_PORT .env.beta "$HOSTINGER_USERNAME@$HOSTINGER_IP:/home/$HOSTINGER_USERNAME/medication-tracker-backend/.env"

# Setup Python environment and start services
Write-Status "Setting up Python environment and starting services..."
$setupCmd = @"
cd ~/medication-tracker-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart medication-tracker-beta
sudo nginx -t && sudo systemctl reload nginx
"@
ssh -p $HOSTINGER_PORT "$HOSTINGER_USERNAME@$HOSTINGER_IP" $setupCmd

# Verify deployment
Write-Status "Verifying deployment..."
$response = Invoke-WebRequest -Uri "https://$BETA_DOMAIN/beta/status" -Method GET
if ($response.StatusCode -eq 200) {
    Write-Status "Beta deployment successful!" "SUCCESS"
    Write-Status "Beta site is now available at: https://$BETA_DOMAIN" "SUCCESS"
} else {
    Write-Status "Beta deployment verification failed!" "ERROR"
    exit 1
}
