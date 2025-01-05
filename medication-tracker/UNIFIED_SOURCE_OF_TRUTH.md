# Unified Source of Truth
Last Updated: 2025-01-02T13:21:22+01:00

## Core Principles

### 1. Single Architecture Pattern
- Clean Architecture with clear boundaries
- Domain-Driven Design for business logic
- CQRS for data operations
- Event-driven for notifications

### 2. Unified Validation Framework
```yaml
ValidationLayers:
  - Domain: Business rules and entities
  - Application: Use cases and workflows
  - Infrastructure: External systems
  - Presentation: User interface

ValidationTypes:
  - Static: Compile-time checks
  - Runtime: Dynamic validations
  - Integration: System interactions
  - Beta: Testing phase specific
```

### 3. Critical Path Definition
```yaml
Paths:
  Core:
    - Medication Management
    - User Authentication
    - Data Security
    - System Health
  
  Beta:
    - Environment Validation
    - Feature Verification
    - Performance Metrics
    - User Experience
    
  Recovery:
    - System Backup
    - Data Recovery
    - Error Handling
    - State Management
```

### 4. Development Standards
```yaml
CodeOrganization:
  - One validation approach per layer
  - Centralized error handling
  - Unified logging system
  - Consistent decorator usage

BestPractices:
  - Pre-validation hooks
  - Post-validation evidence
  - Automated enforcement
  - Continuous monitoring
```

## Implementation Guidelines

### 1. Validation Framework
All validations MUST:
- Use the @validates decorator
- Log to unified logging system
- Generate validation evidence
- Follow recovery protocols

### 2. Code Structure
All components MUST:
- Follow clean architecture
- Use dependency injection
- Implement interface contracts
- Maintain single responsibility

### 3. Beta Testing
All beta features MUST:
- Pass pre-validation
- Generate evidence
- Support rollback
- Monitor performance

### 4. Documentation
All changes MUST:
- Update this document
- Generate evidence
- Follow critical path
- Maintain traceability
