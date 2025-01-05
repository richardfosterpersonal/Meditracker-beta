# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $?) {
    Write-Host "Node.js not found. Installing Node.js..."
    # Download Node.js installer
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    
    # Install Node.js
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
    Remove-Item $nodeInstaller
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "Node.js $nodeVersion is already installed"
}

# Check if npm is installed
$npmVersion = npm --version 2>$null
if (-not $?) {
    Write-Host "npm not found. Please ensure Node.js was installed correctly"
    exit 1
} else {
    Write-Host "npm $npmVersion is already installed"
}

# Install Python dependencies
Write-Host "Installing Python dependencies..."
pip install -r requirements.txt

# Install frontend dependencies
Write-Host "Installing frontend dependencies..."
Set-Location frontend
npm install
Set-Location ..

Write-Host "Setup completed successfully!"
