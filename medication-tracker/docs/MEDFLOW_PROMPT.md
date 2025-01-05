# MedFlow Prompt

## Core Purpose
To validate and execute the medication flow process, ensuring:
1. Drug interaction safety
2. Dosage accuracy
3. Schedule adherence
4. Emergency protocols
5. Family coordination

## Validation Steps

### 1. Drug Safety Check
```typescript
async function validateMedication(medication: Medication): Promise<SafetyResult> {
  // Check drug interactions
  // Validate dosage
  // Verify schedule
  // Return safety status
}
```

### 2. Schedule Validation
```typescript
async function validateSchedule(schedule: MedicationSchedule): Promise<boolean> {
  // Check timing conflicts
  // Verify dosage spacing
  // Validate frequency
  // Return schedule validity
}
```

### 3. Emergency Protocol
```typescript
async function checkEmergencyProtocol(medication: Medication): Promise<EmergencyStatus> {
  // Verify emergency contacts
  // Check critical interactions
  // Validate emergency procedures
  // Return emergency readiness
}
```

## Command Format

### Basic Command
```bash
medflow check [medication-id] [options]
```

### Options
- `--full`: Run comprehensive check
- `--quick`: Run basic validation
- `--emergency`: Validate emergency protocols
- `--schedule`: Check schedule conflicts
- `--family`: Verify family coordination

### Examples
1. Full Check:
   ```bash
   medflow check MED123 --full
   ```

2. Quick Validation:
   ```bash
   medflow check MED123 --quick
   ```

3. Emergency Protocol:
   ```bash
   medflow check MED123 --emergency
   ```

## Response Format

### Success
```json
{
  "status": "success",
  "validations": {
    "drugSafety": true,
    "schedule": true,
    "emergency": true
  },
  "recommendations": []
}
```

### Warning
```json
{
  "status": "warning",
  "validations": {
    "drugSafety": true,
    "schedule": false,
    "emergency": true
  },
  "recommendations": [
    "Adjust evening dose timing"
  ]
}
```

### Error
```json
{
  "status": "error",
  "validations": {
    "drugSafety": false,
    "schedule": true,
    "emergency": true
  },
  "recommendations": [
    "Critical drug interaction detected"
  ]
}
```

## Integration Guide

### TypeScript Usage
```typescript
import { MedFlow } from '@/services/medflow';

const medflow = new MedFlow();
const result = await medflow.check(medicationId, options);
```

### Python Usage
```python
from services.medflow import MedFlow

medflow = MedFlow()
result = medflow.check(medication_id, options)
```

## Best Practices
1. Always run full validation in production
2. Implement retry logic for network failures
3. Cache validation results (max 5 minutes)
4. Log all validation attempts
5. Monitor validation performance

## Error Handling
1. Network timeouts: Retry 3 times
2. Invalid data: Return detailed error
3. System errors: Fail gracefully
4. API limits: Implement backoff

## Monitoring
1. Track validation success rate
2. Monitor average response time
3. Log all critical interactions
4. Alert on validation failures
5. Track emergency protocol usage
