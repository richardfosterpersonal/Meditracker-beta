# Create SSL directory if it doesn't exist
New-Item -ItemType Directory -Force -Path nginx/ssl

# Set OpenSSL environment variable if needed
if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "OpenSSL not found. Please install OpenSSL and add it to your PATH."
    exit 1
}

# Generate DHParam
Write-Host "Generating DHParam..."
openssl dhparam -out nginx/ssl/dhparam.pem 2048

# Generate private key
Write-Host "Generating private key..."
openssl genrsa -out nginx/ssl/medicationtracker.com.key 2048

# Generate CSR
Write-Host "Generating CSR..."
openssl req -new -key nginx/ssl/medicationtracker.com.key -out nginx/ssl/medicationtracker.com.csr -subj "/C=US/ST=California/L=San Francisco/O=Medication Tracker/OU=Development/CN=medicationtracker.com"

# Generate self-signed certificate for development
Write-Host "Generating self-signed certificate..."
openssl x509 -req -days 365 -in nginx/ssl/medicationtracker.com.csr -signkey nginx/ssl/medicationtracker.com.key -out nginx/ssl/medicationtracker.com.crt

Write-Host "SSL certificates generated successfully!"

# Add local domain to hosts file
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$localDomain = "127.0.0.1 medicationtracker.com"

# Check if domain already exists in hosts file
$hostsContent = Get-Content $hostsPath
if (-not ($hostsContent -contains $localDomain)) {
    Write-Host "Adding domain to hosts file..."
    Add-Content -Path $hostsPath -Value "`n$localDomain" -Force
    Write-Host "Domain added to hosts file."
}
