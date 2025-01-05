# Validation Override Protocol

## Purpose
This document outlines the protocol for using validation overrides in emergency situations.

## When to Use Overrides
Overrides should ONLY be used in the following situations:
1. Critical production hotfixes
2. Emergency security patches
3. Time-sensitive client requirements
4. System outages requiring immediate attention

## Override Process

### 1. Create Override Token
```bash
npm run validate --create-override --hours=24 --reason="Critical security patch"
```

Options:
- `--hours`: Duration of override (default: 24)
- `--reason`: Justification for override (required)

### 2. Use Override Token
```bash
npm run validate --override=YOUR_TOKEN
```

### 3. Document Override
After using an override, you MUST:
1. Create an entry in `project_log.md` with:
   - Date and time
   - Reason for override
   - Changes made
   - Impact assessment
2. Create a validation evidence document retrospectively
3. Update the comprehensive validation document

## Override Restrictions
1. Maximum duration: 48 hours
2. Must include valid reason
3. Automatically expires after set duration
4. Cannot override HIPAA compliance checks
5. Must be documented in project log

## Example Override Log Entry
```markdown
## Validation Override - [DATE]
- **Reason**: Critical security patch for authentication
- **Duration**: 24 hours
- **Changes Made**: Updated JWT validation
- **Impact**: No data exposure, system secure
- **Follow-up**: Full validation completed post-fix
```

## Post-Override Requirements
1. Complete full validation within 24 hours
2. Review all changes made during override
3. Update all affected documentation
4. Create retrospective validation evidence
5. Get sign-off from technical lead

## Monitoring and Auditing
All overrides are:
1. Logged in `.validation-override.json`
2. Tracked in project logs
3. Reviewed in weekly security meetings
4. Included in audit trails
5. Monitored for patterns of use
