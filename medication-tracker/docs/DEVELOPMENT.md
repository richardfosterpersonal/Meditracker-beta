# Development Guidelines
Last Updated: 2024-12-24
Validation Status: Compliant

## Important Notice
All development MUST comply with the [Validation Guard](./validation/VALIDATION_GUARD.md) system.
No exceptions without proper override documentation.

## Development Process

### 1. Pre-Development
- [ ] Check [SINGLE_SOURCE_VALIDATION.md](./validation/SINGLE_SOURCE_VALIDATION.md)
- [ ] Run Validation Guard checks
- [ ] Verify critical path alignment
- [ ] Document planned changes

### 2. During Development
- [ ] Follow validation requirements
- [ ] Maintain single source of truth
- [ ] Update validation evidence
- [ ] Run validation checks

### 3. Post-Development
- [ ] Complete validation checklist
- [ ] Update documentation
- [ ] Run final validation
- [ ] Submit validation evidence

## Validation Commands

### Check Validation Status
```bash
./scripts/validation_hooks.py status
```

### Run Pre-Commit Validation
```bash
./scripts/validation_hooks.py pre-commit
```

### Run Pre-Deploy Validation
```bash
./scripts/validation_hooks.py pre-deploy
```

### Override Validation (Requires Documentation)
```bash
./scripts/validation_hooks.py override --reason="REASON" --ticket="TICKET_ID"
```

## Development Standards

### Code Standards
- TypeScript/JavaScript: ESLint + Prettier
- Python: Black + isort
- Validation: Pre-commit hooks

### Testing Standards
- Unit Tests: Jest/Pytest
- Integration Tests: Supertest
- Validation: Test coverage

### Documentation Standards
- Keep SINGLE_SOURCE_VALIDATION.md updated
- Document all validation evidence
- Maintain critical path alignment
- Update validation status

## Beta Phase Requirements

### 1. Security Requirements
- HIPAA compliance
- Data protection
- Access control
- Validation: Security checks

### 2. Monitoring Requirements
- Health monitoring
- Performance metrics
- Security monitoring
- Validation: Monitoring checks

### 3. User Management
- Access control
- Role management
- Audit logging
- Validation: User checks

## Deployment Process

### 1. Pre-Deployment
- Run validation checks
- Update documentation
- Verify critical path
- Collect evidence

### 2. During Deployment
- Monitor validation
- Check health metrics
- Verify security
- Document process

### 3. Post-Deployment
- Validate deployment
- Update status
- Collect evidence
- Document completion
