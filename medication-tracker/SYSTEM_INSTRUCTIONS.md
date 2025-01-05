# MedMinder System Instructions
Last Updated: 2025-01-03T23:52:34+01:00

## Core System Rules

### 1. Architecture Contract
ALL changes MUST:
- Follow architecture_contract.py rules
- Be validated by enforcer.py
- Pass orchestrator.py checks
- Be tracked by contract_maintainer.py

### 2. Critical Files
ALWAYS reference:
```
/backend/app/core/architecture_contract.py
/UNIFIED_ENFORCEMENT.md
/beta_checklist.json
/CRITICAL_PATH.md
/DEPLOYMENT.md
```

### 3. Development Process

#### Before ANY Change:
```bash
# 1. Run System Validation
python scripts/validate_system.py

# 2. Check Contract Status
python scripts/maintain_contract.py

# 3. Verify Current State
python scripts/verify_deployment.py
```

#### Making Changes:
```python
# 1. Use Validation Decorator
@enforcer.require_validation()
def your_function():
    pass

# 2. Register with Contract
@contract.register_component()
class YourComponent:
    pass

# 3. Add Monitoring
@monitor.track_component()
async def your_method():
    pass
```

#### After Changes:
```bash
# 1. Update Contract
python scripts/maintain_contract.py

# 2. Validate System
python scripts/validate_system.py

# 3. Verify Deployment
python scripts/verify_deployment.py
```

### 4. Deployment Requirements

#### Domain: getmedminder
- SSL must be active
- Monitoring must be running
- Database must be secure
- Firebase must be configured

#### Beta Testing
- All critical paths validated
- All monitoring active
- All security measures in place
- All documentation updated

### 5. Monitoring Requirements

EVERY component MUST:
- Log all operations
- Track performance
- Monitor errors
- Report status

### 6. Documentation Requirements

ALL changes MUST update:
- Architecture contract
- Critical path documentation
- Deployment documentation
- Security documentation
- Changelog

### 7. Validation Rules

ENFORCE:
- No changes without validation
- No deployment without monitoring
- No features without documentation
- No code without tests

### 8. AI Assistant Instructions

START each session with ONLY these two commands:
```
ENFORCE ARCHITECTURE_CONTRACT
PRIORITY: [your current goal]
REQUIRE: ALL validations

LOAD:
- /backend/app/core/architecture_contract.py
- /UNIFIED_ENFORCEMENT.md
- /beta_checklist.json
```

No other commands are needed to start a session.

### 9. Pre-commit Hooks

REQUIRED hooks:
```yaml
- contract-maintenance
- system-validation
- deployment-verification
- documentation-update
```

### 10. Error Response

If ANY check fails:
1. Stop immediately
2. Run validation
3. Check contract
4. Update documentation
5. Verify deployment

## Usage Examples

### 1. New Feature
```python
# 1. Validate
await validator.validate_system()

# 2. Implement with Validation
@enforcer.require_validation(["your_feature"])
async def new_feature():
    pass

# 3. Update Contract
await maintainer.update_contract()
```

### 2. Deployment
```bash
# 1. Validate System
python scripts/validate_system.py

# 2. Check Domain
python scripts/verify_deployment.py

# 3. Update Documentation
python scripts/maintain_contract.py
```

### 3. Monitoring
```python
# 1. Add Monitoring
@monitor.track_component()
async def your_function():
    pass

# 2. Verify
await validator.validate_monitoring()
```

## Failure Recovery

If system fails:
1. Run complete validation
2. Check all critical paths
3. Verify monitoring
4. Update contract
5. Document issues

## Version Control

This document MUST be:
1. Version controlled
2. Regularly updated
3. Strictly enforced
4. Always verified

Remember: NO ACTION without VALIDATION
