# Enhanced Validation Checkpoints

## Important Notice
⚠️ Current Migration Status: See [2024-12-24 Comprehensive Validation](./validation/2024-12-24_comprehensive_validation.md) for detailed analysis and state of TypeScript migration.

## MANDATORY PRE-ACTION VALIDATION
Before ANY changes are proposed or implemented:
1. Complete the [Pre-Action Validation Template](./templates/pre_action_validation.md)
2. Submit as evidence in `/docs/validation/evidence/`
3. Get required sign-offs
4. Link to comprehensive validation

Failure to complete pre-action validation will result in automatic rejection of changes.

## Purpose
This document defines mandatory validation steps that MUST be completed before any changes to the codebase. These checkpoints are designed to prevent architectural drift, maintain service boundaries, and ensure cross-platform compatibility.

## Validation Process

### 1. DOCUMENTATION ALIGNMENT
- [ ] Review ALL relevant documentation
- [ ] Verify alignment with documented architecture
- [ ] Check deployment/development guides
- [ ] Verify existing procedures
#### Enhanced Checks
- [ ] Cross-reference dependency documentation against service roles
- [ ] Verify package purposes are documented and justified
- [ ] Confirm documentation patterns match implementation
- [ ] Validate separation of concerns in documentation

### 2. EXISTING CODEBASE VERIFICATION
- [ ] Examine related configuration files
- [ ] Check existing implementations
- [ ] Review project structure patterns
- [ ] Verify dependencies and configurations
#### Enhanced Checks
- [ ] Validate each dependency against service's core purpose
- [ ] Check cross-platform compatibility
- [ ] Identify unnecessary or conflicting dependencies
- [ ] Verify frontend/backend dependency separation
- [ ] Validate container-specific requirements

### 3. SINGLE SOURCE OF TRUTH
- [ ] Verify alignment with project standards
- [ ] Check all related configuration files
- [ ] Maintain consistency with existing patterns
- [ ] Plan documentation updates
#### Enhanced Checks
- [ ] Verify actual package usage in code
- [ ] Justify dependencies with implementation needs
- [ ] Ensure configuration file consistency
- [ ] Establish doc-to-implementation traceability

### 4. CRITICAL PATH ADHERENCE
- [ ] Confirm correct sequence
- [ ] Verify prerequisites
- [ ] Assess component impact
- [ ] Check component dependencies
#### Enhanced Checks
- [ ] Validate deployment environment assumptions
- [ ] Address platform-specific considerations
- [ ] Verify service boundaries and interactions
- [ ] Maintain execution path separation of concerns

### 5. RISK ASSESSMENT
- [ ] Identify potential failures
- [ ] Analyze component effects
- [ ] Define rollback strategy
- [ ] Verify current state
#### Enhanced Checks
- [ ] Assess cross-platform compatibility risks
- [ ] Identify environment conflicts
- [ ] Validate package purpose assumptions
- [ ] Plan dependency issue resolution

### 6. DEPENDENCY AND PLATFORM VALIDATION
- [ ] Justify dependencies against architecture
- [ ] Check for misplaced GUI/CLI packages
- [ ] Verify platform-specific paths
- [ ] Document container assumptions
- [ ] Validate service-specific dependencies
- [ ] Check environment differences

### 7. ARCHITECTURAL COMPLIANCE
- [ ] Verify service boundaries
- [ ] Validate dependency appropriateness
- [ ] Check for unnecessary coupling
- [ ] Verify architectural principles
- [ ] Check service responsibilities
- [ ] Maintain architectural integrity

### 8. CONTAINER BUILD VALIDATION
- [ ] Validate container build process
- [ ] Verify container configuration
- [ ] Check startup scripts
- [ ] Perform security scanning
- [ ] Configure resource limits

## Validation Requirements

### Evidence Collection
- Must document specific codebase evidence for each checkpoint
- Include file paths, line numbers, and relevant code snippets
- Document configuration settings and environment variables
- Reference related documentation and standards

### Validation Blockers
DO NOT proceed if any of these conditions exist:
1. Incomplete verification of any checkpoint
2. Documentation-implementation misalignment
3. Service boundary violations
4. Unresolved platform-specific issues
5. Architectural principle violations

### Documentation Updates
After validation:
1. Update relevant documentation
2. Record decisions and justifications
3. Update architecture diagrams if needed
4. Maintain validation audit trail

## Usage Instructions
1. Copy checklist for each change
2. Complete ALL checkpoints
3. Provide evidence for each item
4. Document any exceptions
5. Maintain in version control
6. Reference in pull requests

## Validation Evidence Template
```markdown
## Change Description
[Describe the proposed change]

## Validation Evidence
### Documentation Alignment
- Evidence: [file paths, snippets]
- Justification: [explanation]

[Continue for each section...]

## Exceptions & Mitigations
[Document any exceptions and how they're handled]

## Sign-off
- [ ] All checkpoints verified
- [ ] Evidence collected
- [ ] Documentation updated
- [ ] Architectural compliance confirmed
