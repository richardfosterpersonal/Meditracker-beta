# Validation Chain Synchronization Script
# Updates and validates all critical path documents and their references

# Set timestamp
$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss+01:00"
$projectRoot = Split-Path -Parent $PSScriptRoot
$docsDir = Join-Path $projectRoot "docs"
$validationDir = Join-Path $docsDir "validation"

# Update timestamps in all critical path documents
function Update-Timestamps {
    param (
        [string]$file
    )
    if (Test-Path $file) {
        $content = Get-Content $file
        $content = $content -replace "Last Updated: .*", "Last Updated: $timestamp"
        Set-Content -Path $file -Value $content
        Write-Host "Updated timestamp in $file"
    }
    else {
        Write-Host "Warning: File not found - $file"
    }
}

# Update all critical path documents
$criticalPaths = @(
    (Join-Path $validationDir "critical_path/MASTER_CRITICAL_PATH.md"),
    (Join-Path $validationDir "MASTER_VALIDATION_INDEX.md"),
    (Join-Path $validationDir "VALIDATION_CHAIN.md"),
    (Join-Path $docsDir "MASTER_CRITICAL_PATH.md"),
    (Join-Path $docsDir "BETA_CRITICAL_PATH.md"),
    (Join-Path $docsDir "VALIDATION_DOCUMENTATION.md"),
    (Join-Path $docsDir "MASTER_ALIGNMENT.md")
)

Write-Host "Updating critical path documents..."
foreach ($path in $criticalPaths) {
    Update-Timestamps $path
}

# Create validation chain index
Write-Host "Creating validation chain index..."
$validationChain = @{
    last_updated = $timestamp
    critical_paths = @{
        master = "docs/validation/critical_path/MASTER_CRITICAL_PATH.md"
        beta = "docs/BETA_CRITICAL_PATH.md"
        validation = "docs/VALIDATION_DOCUMENTATION.md"
        alignment = "docs/MASTER_ALIGNMENT.md"
    }
    validation_status = "active"
    validation_required = $false
    last_validation = $timestamp
}

$validationChainJson = ConvertTo-Json $validationChain -Depth 10
Set-Content -Path (Join-Path $validationDir "VALIDATION_CHAIN.json") -Value $validationChainJson

# Create git hooks directory
$hooksDir = Join-Path $projectRoot ".git/hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir | Out-Null
}

# Create pre-commit hook
$preCommitHook = @"
#!/bin/sh
pwsh ./scripts/sync_validation_chain.ps1
python ./scripts/sync_validation_chain.py

# Check if validation passed
if [ `$? -ne 0 ]; then
    echo "Error: Validation failed. Please fix validation issues before committing."
    exit 1
fi
"@

Set-Content -Path (Join-Path $hooksDir "pre-commit") -Value $preCommitHook

Write-Host "Validation chain synchronization complete!"
