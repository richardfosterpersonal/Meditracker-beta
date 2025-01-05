# Frontend coverage
Push-Location packages/frontend
npm run test -- --coverage --watchAll=false
Pop-Location

# Backend coverage
Push-Location packages/backend
python -m pytest --cov=app --cov-report=xml
Pop-Location

# Core package coverage
Push-Location packages/core
npm run test -- --coverage --watchAll=false
Pop-Location

# Shared package coverage
Push-Location packages/shared
npm run test -- --coverage --watchAll=false
Pop-Location

Write-Host "Coverage reports generated successfully"
