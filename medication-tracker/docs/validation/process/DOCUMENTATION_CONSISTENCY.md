# Documentation Consistency Requirements
Last Updated: 2024-12-25T21:09:13+01:00
Status: CRITICAL
Reference: ../decisions/CRITICAL_PATH_ANALYSIS.md

## Single Source of Truth

### 1. Critical Path Documentation
```markdown
Location: /docs/validation/decisions/CRITICAL_PATH_ANALYSIS.md
Required Elements:
- Core requirements
- Priority levels
- Safety implications
- Implementation status
```

### 2. Validation Process Documentation
```markdown
Location: /docs/validation/process/VALIDATION_PROCESS.md
Required Elements:
- Validation hooks
- Process flow
- Error handling
- Safety checks
```

### 3. Code Documentation
```markdown
Location: All Python files
Required Elements:
- Last updated timestamp
- Status indicator
- Reference to critical path
- Safety implications
```

## Consistency Rules

### 1. Timestamp Consistency
```markdown
Rule: All timestamps must be:
- In ISO format
- UTC timezone
- Updated on every change
- Tracked in version control
```

### 2. Reference Consistency
```markdown
Rule: All references must:
- Use relative paths
- Be verified to exist
- Link to specific sections
- Maintain bidirectional links
```

### 3. Status Consistency
```markdown
Rule: All status indicators must:
- Match critical path
- Reflect current state
- Be explicitly stated
- Be regularly verified
```

## Validation Process

### 1. Documentation Check
```markdown
Process:
1. Verify timestamps
2. Check references
3. Validate status
4. Ensure completeness
```

### 2. Code Alignment
```markdown
Process:
1. Check docstrings
2. Verify imports
3. Validate hooks
4. Confirm safety
```

### 3. Critical Path Alignment
```markdown
Process:
1. Check priorities
2. Verify requirements
3. Validate safety
4. Ensure coverage
```

## Implementation Guidelines

### 1. Adding New Documentation
```markdown
Steps:
1. Create with template
2. Add to critical path
3. Update references
4. Run validation
```

### 2. Updating Documentation
```markdown
Steps:
1. Update timestamp
2. Check references
3. Verify consistency
4. Run validation
```

### 3. Removing Documentation
```markdown
Steps:
1. Check references
2. Update critical path
3. Remove references
4. Run validation
```

## Monitoring and Maintenance

### 1. Regular Checks
```markdown
Frequency: Daily
Process:
1. Run all validations
2. Check timestamps
3. Verify references
4. Update status
```

### 2. Consistency Reports
```markdown
Frequency: Weekly
Content:
1. Documentation status
2. Reference health
3. Critical path alignment
4. Safety coverage
```

### 3. Critical Updates
```markdown
Process:
1. Update critical path
2. Check all references
3. Run validations
4. Update status
```

This document serves as the single source of truth for documentation consistency requirements.
