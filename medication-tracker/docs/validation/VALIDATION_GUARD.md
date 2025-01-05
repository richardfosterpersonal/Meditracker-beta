# Validation Guard
Last Updated: 2024-12-24

## Mandatory Pre-Action Checklist
This checklist MUST be completed before ANY changes:

### 1. Single Source Verification
- [ ] Consulted SINGLE_SOURCE_VALIDATION.md
- [ ] Checked for existing documentation
- [ ] Verified no duplicate sources created

### 2. Critical Path Impact
- [ ] Medication Safety impact assessed
- [ ] Data Security impact assessed
- [ ] Core Infrastructure impact assessed

### 3. Beta Phase Alignment
- [ ] Security Requirements checked
- [ ] Monitoring Requirements verified
- [ ] User Management impact assessed

### 4. Validation Evidence
- [ ] Required evidence documented
- [ ] Changes pre-documented
- [ ] Existing process checked

## Integration Points
This guard is automatically enforced at:
1. Pre-commit validation
2. Pull request validation
3. Deployment validation
4. Beta phase transitions

## Enforcement
1. All changes MUST have a completed checklist
2. Violations trigger immediate rollback
3. Exceptions require documented override

## Override Protocol
1. Document reason in VALIDATION_OVERRIDE.md
2. Get explicit approval
3. Create post-override validation plan
