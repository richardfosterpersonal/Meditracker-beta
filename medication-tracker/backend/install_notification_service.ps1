# PowerShell script to install the notification worker as a Windows service
$serviceName = "MedicationTrackerNotifications"
$displayName = "Medication Tracker Notification Service"
$description = "Handles medication reminders and notifications for the Medication Tracker application"

# Get the current directory
$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = "python"  # Update this if you need to specify a full path to Python
$scriptPath = Join-Path $currentDir "notification_worker.py"

# Create the service wrapper script
$wrapperScript = @"
import sys
import os
import time
from pathlib import Path

# Add the application directory to Python path
app_dir = str(Path(__file__).resolve().parent)
sys.path.insert(0, app_dir)

# Import and run the worker
from notification_worker import run_worker
run_worker()
"@

$wrapperPath = Join-Path $currentDir "notification_service_wrapper.py"
Set-Content -Path $wrapperPath -Value $wrapperScript

# Create the service using NSSM
try {
    # Check if NSSM is installed
    if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
        Write-Host "NSSM is not installed. Please install NSSM first."
        Write-Host "You can download it from: https://nssm.cc/"
        exit 1
    }

    # Remove existing service if it exists
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Removing existing service..."
        nssm remove $serviceName confirm
    }

    # Install the new service
    Write-Host "Installing service..."
    nssm install $serviceName $pythonPath
    nssm set $serviceName AppParameters "$wrapperPath"
    nssm set $serviceName DisplayName $displayName
    nssm set $serviceName Description $description
    nssm set $serviceName AppDirectory $currentDir
    nssm set $serviceName Start SERVICE_AUTO_START
    
    # Set failure actions (restart on failure)
    nssm set $serviceName AppRestartDelay 30000
    nssm set $serviceName AppStopMethodConsole 1000
    nssm set $serviceName AppStopMethodWindow 1000
    nssm set $serviceName AppStopMethodThreads 1000
    
    # Set logging
    $logDir = Join-Path $currentDir "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir
    }
    nssm set $serviceName AppStdout (Join-Path $logDir "notification_service.log")
    nssm set $serviceName AppStderr (Join-Path $logDir "notification_service_error.log")

    # Start the service
    Write-Host "Starting service..."
    Start-Service $serviceName

    Write-Host "Service installed and started successfully!"
    Write-Host "Service Name: $serviceName"
    Write-Host "Display Name: $displayName"
    Write-Host "Status: $((Get-Service $serviceName).Status)"
    Write-Host "Log files can be found in: $logDir"
}
catch {
    Write-Host "Error installing service: $_"
    exit 1
}
