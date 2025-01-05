# Load Testing Suite

This directory contains load testing scripts for critical paths of the Medication Tracker application.

## Prerequisites

1. Install k6:
```bash
winget install k6
```

2. Set environment variables:
```bash
set BASE_URL=http://localhost:8000
```

## Running Tests

### All Critical Paths
```bash
k6 run main.js
```

### Individual Scenarios
```bash
k6 run scenarios/auth.js
k6 run scenarios/medications.js
k6 run scenarios/emergency.js
k6 run scenarios/alerts.js
```

## Test Configuration

- **Stages**:
  1. Ramp up to 50 users (1m)
  2. Ramp up to 100 users (2m)
  3. Steady load at 100 users (5m)
  4. Stress test at 200 users (3m)
  5. Cool down (1m)

- **Thresholds**:
  - 95% of requests < 500ms
  - Error rate < 1%
  - Auth operations < 1000ms
  - Medication operations < 800ms
  - Emergency operations < 300ms
  - Alert operations < 400ms

## Test Scenarios

1. **Authentication**
   - Login
   - Token refresh
   - Password reset request

2. **Medication Management**
   - List medications
   - Add medication
   - Get medication details
   - Update medication
   - Check drug interactions

3. **Emergency Protocols**
   - List emergency contacts
   - Add emergency contact
   - Trigger emergency notification
   - Access emergency logs

4. **Alert System**
   - Get active alerts
   - Get alert history
   - Update preferences
   - Acknowledge alerts

## Monitoring

View real-time metrics in Grafana dashboards:
- Performance metrics
- Error rates
- Response times
- System resources

## Success Criteria

1. All thresholds met
2. No system crashes
3. Error rate < 1%
4. Response times within limits
5. Resource usage within bounds
