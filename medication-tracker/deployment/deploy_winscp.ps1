# WinSCP Deployment Script
# Last Updated: 2025-01-02T21:03:57+01:00

# Download and install WinSCP .NET assembly
$assemblyPath = "$PSScriptRoot\WinSCPnet.dll"
if (-not (Test-Path $assemblyPath)) {
    $url = "https://downloads.sourceforge.net/project/winscp/WinSCP/5.21.5/WinSCP-5.21.5-Automation.zip"
    $zipPath = "$PSScriptRoot\WinSCP.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $PSScriptRoot
    Remove-Item $zipPath
}

# Load WinSCP .NET assembly
Add-Type -Path $assemblyPath

# Configuration
$hostName = "46.202.198.2"
$userName = "u374242363"
$port = 65002
$remotePath = "/home/u374242363/domains/getmedminder.com/public_html/beta/"
$localPath = "deployment/test_deploy.txt"

# Set up session options
$sessionOptions = New-Object WinSCP.SessionOptions -Property @{
    Protocol = [WinSCP.Protocol]::Sftp
    HostName = $hostName
    UserName = $userName
    PortNumber = $port
    GiveUpSecurityAndAcceptAnySshHostKey = $true
}

try {
    Write-Host "Connecting to remote server..." -ForegroundColor Yellow
    $session = New-Object WinSCP.Session
    $session.Open($sessionOptions)

    Write-Host "Uploading test file..." -ForegroundColor Yellow
    $transferOptions = New-Object WinSCP.TransferOptions
    $transferOptions.TransferMode = [WinSCP.TransferMode]::Binary

    $transferResult = $session.PutFiles($localPath, $remotePath, $False, $transferOptions)

    if ($transferResult.IsSuccess) {
        Write-Host "Upload successful!" -ForegroundColor Green
        foreach ($transfer in $transferResult.Transfers) {
            Write-Host "Uploaded $($transfer.FileName)" -ForegroundColor Green
        }
    } else {
        Write-Host "Upload failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($session) {
        $session.Dispose()
    }
}
