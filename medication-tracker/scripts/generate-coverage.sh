#!/bin/bash

# Frontend coverage
cd packages/frontend
npm run test -- --coverage --watchAll=false
cd ../..

# Backend coverage
cd packages/backend
python -m pytest --cov=app --cov-report=xml
cd ../..

# Core package coverage
cd packages/core
npm run test -- --coverage --watchAll=false
cd ../..

# Shared package coverage
cd packages/shared
npm run test -- --coverage --watchAll=false
cd ../..

# Combine coverage reports (if needed)
# You might need to install a coverage combiner tool if you want to merge the reports
