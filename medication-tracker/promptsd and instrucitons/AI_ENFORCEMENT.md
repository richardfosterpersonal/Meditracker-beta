# AI Assistant Enforcement Protocol
Last Updated: 2025-01-03T23:24:18+01:00

## Core Principles
1. MAINTAIN DEPLOYMENT READINESS
2. VALIDATE BEFORE CHANGING
3. MONITOR EVERYTHING
4. PRESERVE CONTEXT

## Required Files for Context
- /beta_checklist.json
- /project_log.md
- /CRITICAL_PATH.md
- /DEPLOYMENT.md
- /.env files
- /beta_launch.log

## Mandatory Steps for Every Action

### 1. CONTEXT LOADING (NO EXCEPTIONS)
```bash
# Required Files Check
1. View beta_checklist.json
2. View project_log.md
3. View current deployment status
4. Check environment configurations
```

### 2. STATE VALIDATION (BEFORE ANY CHANGE)
```bash
# Validation Steps
1. List affected components
2. Check dependencies
3. Verify monitoring
4. Confirm deployment impact
```

### 3. CHANGE PROTOCOL
```bash
# Change Requirements
1. Document current state
2. List all dependencies
3. Verify monitoring hooks
4. Ensure deployment readiness
```

### 4. DEPLOYMENT FOCUS
```bash
# Deployment Checklist
1. Domain: getmedminder
2. Environment: beta
3. Monitoring: active
4. Rollback: ready
```

## Enforcement Rules

### Rule 1: Context Preservation
- MUST load context files before ANY action
- MUST verify current state before changes
- MUST maintain deployment readiness

### Rule 2: Validation Requirements
- NO changes without dependency analysis
- NO deployment without monitoring
- NO features without validation

### Rule 3: Monitoring Mandate
- ALL changes must have monitoring
- ALL deployments must be tracked
- ALL errors must be logged

### Rule 4: Deployment Priority
- getmedminder domain is PRIMARY
- Beta testing is CRITICAL
- Monitoring is MANDATORY

## Implementation Guide

### For Each Task:
1. Load Context:
   ```bash
   - Check beta_checklist.json
   - Review project_log.md
   - Verify deployment status
   ```

2. Validate State:
   ```bash
   - List affected files
   - Check dependencies
   - Verify monitoring
   ```

3. Make Changes:
   ```bash
   - Document changes
   - Update monitoring
   - Verify deployment
   ```

4. Verify Deployment:
   ```bash
   - Check domain status
   - Verify monitoring
   - Confirm rollback
   ```

## Error Prevention

### NEVER:
- Skip context loading
- Ignore dependencies
- Bypass monitoring
- Break deployment

### ALWAYS:
- Load context files
- Check dependencies
- Verify monitoring
- Maintain deployment

## Success Metrics

### Required for ALL Changes:
1. Deployment Status: VERIFIED
2. Monitoring: ACTIVE
3. Rollback: READY
4. Context: PRESERVED

## Usage Instructions

1. At Start of Conversation:
   ```bash
   LOAD_CONTEXT
   VERIFY_STATE
   CHECK_DEPLOYMENT
   ```

2. Before Each Change:
   ```bash
   VALIDATE_DEPENDENCIES
   CHECK_MONITORING
   VERIFY_DEPLOYMENT_IMPACT
   ```

3. After Each Change:
   ```bash
   VERIFY_MONITORING
   CHECK_DEPLOYMENT
   DOCUMENT_STATE
   ```

## Failure Responses

If ANY check fails:
1. Stop immediately
2. Document failure
3. Verify deployment safety
4. Request human validation

## Version Control

This protocol must be:
1. Version controlled
2. Regularly updated
3. Strictly enforced
4. Always verified

Remember: NO ACTION without VALIDATION
