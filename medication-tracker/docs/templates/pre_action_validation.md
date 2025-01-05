# Pre-Action Validation Template

## Purpose
This template MUST be filled out before proposing or implementing any changes. It ensures context preservation and prevents duplicate work.

## Instructions
1. Create a new file in `/docs/validation/evidence/YYYY-MM-DD_action_name.md`
2. Copy this template
3. Fill out ALL sections
4. Link to evidence
5. Get required sign-offs

## Template

```markdown
# Pre-Action Validation Evidence
Date: [YYYY-MM-DD]
Time: [HH:MM]
Action: [Brief description]

## 1. Documentation Review
- [ ] Validation document reviewed
  - Evidence: [Link]
  - Key findings: [Summary]
- [ ] Existing implementations checked
  - Search results: [Summary]
  - Related code: [Links]
- [ ] Project logs examined
  - Relevant entries: [Links]
- [ ] Migration status verified
  - Current status: [%]
  - Impact assessment: [Details]

## 2. Implementation Check
- [ ] Codebase searched
  - Search terms: [List]
  - Results: [Summary]
- [ ] Features registry checked
  - Existing features: [List]
  - Potential conflicts: [Details]
- [ ] Test coverage verified
  - Current coverage: [%]
  - Affected areas: [List]
- [ ] Dependencies validated
  - Required: [List]
  - Conflicts: [List]

## 3. Critical Path Alignment
- [ ] Aligned with TypeScript migration
  - Migration phase: [Current phase]
  - Impact: [Details]
- [ ] No duplicate work found
  - Search evidence: [Links]
  - Verification: [Details]
- [ ] No conflicts identified
  - Analysis: [Summary]
  - Risks: [List]
- [ ] Clear necessity established
  - Justification: [Details]
  - Benefits: [List]

## 4. Risk Assessment
- [ ] Security impact evaluated
  - HIPAA compliance: [Status]
  - Security measures: [List]
- [ ] Performance impact assessed
  - Current metrics: [Details]
  - Expected impact: [Analysis]
- [ ] Compliance maintained
  - Requirements: [List]
  - Validation: [Details]
- [ ] Rollback plan available
  - Steps: [List]
  - Recovery time: [Estimate]

## 5. Evidence Links
1. Documentation
   - [Link to relevant docs]
   - [Link to validation report]
2. Code
   - [Link to existing implementations]
   - [Link to affected areas]
3. Tests
   - [Link to test coverage]
   - [Link to test plans]
4. Related Work
   - [Link to related PRs]
   - [Link to discussions]

## 6. Sign-off Checklist
- [ ] Technical review complete
  - Reviewer: [Name]
  - Date: [YYYY-MM-DD]
- [ ] Documentation verified
  - Reviewer: [Name]
  - Date: [YYYY-MM-DD]
- [ ] Critical path checked
  - Reviewer: [Name]
  - Date: [YYYY-MM-DD]
- [ ] Impact assessed
  - Reviewer: [Name]
  - Date: [YYYY-MM-DD]

## Final Validation
Validated by: [NAME]
Role: [ROLE]
Date: [YYYY-MM-DD]
Time: [HH:MM]

## Notes
[Any additional context or important observations]
```

## Usage Requirements
1. ALL sections must be completed
2. Evidence must be linked
3. Sign-offs must be obtained
4. Template must be committed to repository

## Example Usage
See `/docs/validation/evidence/` for completed examples.
