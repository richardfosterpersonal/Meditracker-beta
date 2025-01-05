# Create SSL directory if it doesn't exist
New-Item -ItemType Directory -Force -Path nginx/ssl

# Create configuration for OpenSSL
$configContent = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = US
ST = Development
L = Local
O = Medication Tracker
OU = Development
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
"@

# Write OpenSSL configuration
$configContent | Out-File -FilePath "nginx/ssl/openssl.cnf" -Encoding ASCII

# Find OpenSSL in Git installation
$gitPath = (Get-Command git).Source
$openSslPath = Join-Path (Split-Path $gitPath) "usr\bin\openssl.exe"

if (Test-Path $openSslPath) {
    Write-Host "Found OpenSSL at: $openSslPath"
    
    # Generate private key and certificate
    & $openSslPath req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout "nginx/ssl/localhost.key" `
        -out "nginx/ssl/localhost.crt" `
        -config "nginx/ssl/openssl.cnf"
        
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSL certificate generated successfully!"
    } else {
        Write-Host "Failed to generate SSL certificate"
    }
} else {
    Write-Host "OpenSSL not found. Please install Git with OpenSSL."
}
