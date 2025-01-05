# Unified Validation Enforcement
Last Updated: 2025-01-02T13:29:35+01:00

## Core Principles

1. **Zero Exceptions Policy**
   - EVERY component, regardless of perceived criticality, MUST use the unified validation framework
   - NO exceptions for "simple", "utility", or "helper" components
   - ALL code paths MUST be validated and evidenced

2. **Proactive Development Requirements**
   - All new code MUST be registered with the unified framework BEFORE implementation
   - Critical path validation MUST occur at design time, not just runtime
   - Validation evidence MUST be collected continuously, not just during errors

3. **Single Source of Truth**
   - One validation framework
   - One critical path system
   - One evidence collection mechanism
   - One configuration management approach

4. **Enforcement Mechanisms**
   - Pre-commit hooks to verify unified validation compliance
   - Continuous validation during development
   - Automated critical path verification
   - Real-time evidence collection and verification

## Implementation Requirements

1. **Code Level**
   - ALL classes MUST use @unified_validation decorator
   - ALL functions MUST provide validation evidence
   - ALL data flows MUST be tracked through the unified system

2. **System Level**
   - ALL services MUST register with ValidationOrchestrator
   - ALL configurations MUST be validated through UnifiedFramework
   - ALL state changes MUST be evidenced and validated

3. **Infrastructure Level**
   - ALL deployments MUST pass unified validation
   - ALL environment changes MUST be validated
   - ALL external interactions MUST be tracked

4. **Documentation Level**
   - ALL components MUST reference the unified critical path
   - ALL changes MUST update the single source of truth
   - ALL documentation MUST be validated

## Validation Checklist

Before ANY code changes:
1. Register with unified framework
2. Define critical path position
3. Establish evidence collection points
4. Set up validation hooks
5. Configure error boundaries
6. Document in single source of truth

## Error Prevention

1. **Design Time**
   - Validate architectural alignment
   - Verify critical path compliance
   - Check evidence collection points

2. **Development Time**
   - Enforce unified validation usage
   - Verify evidence collection
   - Test critical path integration

3. **Runtime**
   - Monitor validation compliance
   - Track evidence collection
   - Verify critical path adherence

## Continuous Improvement

1. **Evidence Analysis**
   - Regular review of validation patterns
   - Identification of validation gaps
   - Proactive enhancement of validation coverage

2. **Critical Path Evolution**
   - Continuous critical path assessment
   - Proactive identification of new critical paths
   - Regular validation coverage updates

3. **Framework Enhancement**
   - Regular framework capability assessment
   - Proactive feature addition
   - Continuous validation improvement

## Non-Compliance Protocol

Any code that does not follow these requirements MUST be:
1. Immediately flagged
2. Blocked from deployment
3. Refactored to comply
4. Re-validated entirely
5. Fully evidenced

There are NO EXCEPTIONS to these requirements. This is a medical application where lives depend on our consistency and thoroughness.
