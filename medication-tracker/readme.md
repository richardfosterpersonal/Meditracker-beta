# Medication Tracker
Last Updated: 2025-01-05T15:57:00+01:00
Status: BETA
Reference: docs/validation/MASTER_VALIDATION_INDEX.md

[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-white.svg)](https://sonarcloud.io/summary/new_code?id=richardfosterpersonal_Meditracker-beta)

## Overview
A HIPAA-compliant medication tracking system focusing on patient safety and reliable medication management.

## Project Structure

The project is organized as a monorepo using Lerna:

```
medication-tracker/
├── packages/
│   ├── shared/           # Shared types, validation schemas, and utilities
│   ├── core/            # Core business logic
│   ├── frontend/        # React-based web application
│   └── backend/         # Flask-based API server
├── infrastructure/      # Deployment and infrastructure code
└── tools/              # Development and build tools
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Bootstrap the monorepo:
   ```bash
   npm run bootstrap
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

4. Start the development environment:
   ```bash
   npm start
   ```

## Development

- Frontend: React application with TypeScript
- Backend: Python Flask API with SQLAlchemy
- Shared: Common types and validation schemas
- Core: Business logic and domain services

## Testing

Run tests across all packages:
```bash
npm test
```

## Linting

Lint all packages:
```bash
npm run lint
```

## Quality Assurance

We use SonarQube for continuous code quality monitoring. Run the analysis:
```bash
npm run sonar
```

## Project Status

This project is currently in beta development, following a strict validation process outlined in our [Master Validation Index](docs/validation/MASTER_VALIDATION_INDEX.md).

### Critical Path Status
- Following [Beta Completion Path](docs/validation/critical_path/BETA_COMPLETION_PATH.md)
- Maintaining [Validation Chain](docs/validation/VALIDATION_CHAIN.md)
- Tracking [Evidence](docs/validation/evidence/)

## Critical Path Focus
This project maintains strict adherence to its critical path:
1. Medication Safety
2. Data Security
3. System Reliability

## Deployment

Deployment follows our validated process:
1. Check validation status
2. Run validation tests
3. Update validation chain
4. Document evidence

## Contributing

Please read:
1. [CONTRIBUTING.md](CONTRIBUTING.md)
2. [Validation Process](docs/validation/process/)
3. [Critical Path](docs/validation/critical_path/MASTER_CRITICAL_PATH.md)

## License

MIT

This README maintains alignment with our validation process.