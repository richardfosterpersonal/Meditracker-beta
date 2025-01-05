# Deployment Documentation

## Overview
This document outlines the deployment process and requirements for the MedMinder application.

## Environment Variables
The following environment variables must be set:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_USER=database_user
DB_PASSWORD=database_password
FIREBASE_CONFIG=firebase_config_json
```

## Dependencies
### Frontend
```bash
npm install
```

### Backend
```bash
pip install -r requirements.txt
```

## Deployment Steps
1. Set environment variables
2. Install dependencies
3. Build frontend
4. Build backend
5. Run database migrations
6. Start services

## Health Checks
- Frontend: http://localhost:3000/health
- Backend: http://localhost:8000/health

## Monitoring
- Logs are available in /var/log/medminder/
- Metrics are exposed at /metrics endpoint

## Rollback
In case of deployment failure:
1. Stop services
2. Revert database migrations
3. Deploy previous version
