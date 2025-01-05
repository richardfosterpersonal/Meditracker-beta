# Medication Tracker Technical Documentation

## Overview
This documentation provides technical details for developers working on the Medication Tracker application. The application is built with a focus on real-time updates, offline capabilities, and robust error handling.

## Core Services

### WebSocket Service
Real-time communication service for instant updates.

```typescript
import { webSocketService } from '../services/WebSocketService';

// Subscribe to updates
const unsubscribe = webSocketService.subscribe('MEDICATION_UPDATE', (payload) => {
  // Handle update
});

// Send message
await webSocketService.send({
  type: 'MEDICATION_UPDATE',
  priority: 'HIGH',
  payload: { /* ... */ }
});
```

### Push Notification Service
Handles user notifications across devices.

```typescript
import { pushNotificationService } from '../services/PushNotificationService';

// Request permission
await pushNotificationService.requestPermission();

// Send notification
await pushNotificationService.sendNotification('Medication Due', {
  body: 'Time to take your medication',
  priority: 'HIGH'
});
```

### Background Sync Service
Manages offline operations and data synchronization.

```typescript
import { backgroundSyncService } from '../services/BackgroundSyncService';

// Queue operation
await backgroundSyncService.queueOperation(
  'MEDICATION_UPDATE',
  { /* data */ },
  'HIGH'
);

// Check queue status
const status = await backgroundSyncService.getQueueStatus();
```

## Security & Liability Protection

### Critical Actions
All critical actions are logged and tracked:

```typescript
import { liabilityProtection } from '../utils/liabilityProtection';

liabilityProtection.logCriticalAction(
  'MEDICATION_STATUS_UPDATE',
  'user-id',
  { /* metadata */ },
  true
);
```

### Error Handling
Comprehensive error tracking and reporting:

```typescript
try {
  // Critical operation
} catch (error) {
  liabilityProtection.logLiabilityRisk(
    'OPERATION_FAILED',
    'HIGH',
    { error }
  );
}
```

## Best Practices

### Real-time Updates
1. Always handle connection failures gracefully
2. Implement retry mechanisms with exponential backoff
3. Log all critical message failures

### Offline Support
1. Queue operations when offline
2. Sync in order of priority when online
3. Handle conflicts during sync

### Error Handling
1. Log all critical errors
2. Provide user feedback for recoverable errors
3. Implement fallback mechanisms

## API Reference

### WebSocket Events
- `MEDICATION_UPDATE`: Medication schedule changes
- `EMERGENCY`: Emergency situations
- `FAMILY_UPDATE`: Family member updates
- `SYSTEM`: System notifications

### Push Notification Types
- Regular updates: `LOW` priority
- Schedule reminders: `MEDIUM` priority
- Missed medications: `HIGH` priority
- Emergency alerts: `CRITICAL` priority

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Security Tests
```bash
npm run test:security
```

## Deployment

### Environment Variables
```env
REACT_APP_WEBSOCKET_URL=ws://localhost:8080
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_key
```

### Build Process
```bash
npm run build
```

### Production Considerations
1. Enable service worker caching
2. Configure proper SSL certificates
3. Set up proper CORS headers
4. Enable rate limiting
5. Configure proper security headers
