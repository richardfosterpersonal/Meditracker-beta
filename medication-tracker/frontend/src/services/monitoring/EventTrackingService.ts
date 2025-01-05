import { OfflineQueueService } from '../offline/OfflineQueueService';
import { HIPAAComplianceService } from '../security/HIPAAComplianceService';
import { NetworkService } from '../network/NetworkService';

export interface TrackingEvent {
  type: string;
  category: 'medication' | 'user' | 'family' | 'emergency' | 'system';
  action: string;
  metadata: Record<string, any>;
  timestamp: string;
  userId: string;
  critical?: boolean;
}

export class EventTrackingService {
  private static instance: EventTrackingService;
  private offlineQueue: OfflineQueueService;
  private hipaaCompliance: HIPAAComplianceService;
  private networkService: NetworkService;

  private constructor() {
    this.offlineQueue = OfflineQueueService.getInstance();
    this.hipaaCompliance = HIPAAComplianceService.getInstance();
    this.networkService = NetworkService.getInstance();
  }

  public static getInstance(): EventTrackingService {
    if (!EventTrackingService.instance) {
      EventTrackingService.instance = new EventTrackingService();
    }
    return EventTrackingService.instance;
  }

  public async trackEvent(event: Omit<TrackingEvent, 'timestamp'>): Promise<void> {
    const fullEvent: TrackingEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Sanitize data according to HIPAA requirements
    const sanitizedEvent = this.sanitizeEvent(fullEvent);

    // Add to offline queue
    await this.offlineQueue.add({
      type: 'EVENT_TRACKING',
      data: sanitizedEvent,
      priority: event.critical ? 'high' : 'normal'
    });

    // If online, process immediately
    if (this.networkService.isOnline()) {
      await this.processQueue();
    }
  }

  private sanitizeEvent(event: TrackingEvent): TrackingEvent {
    return {
      ...event,
      metadata: this.hipaaCompliance.sanitize(event.metadata)
    };
  }

  private async processQueue(): Promise<void> {
    const events = await this.offlineQueue.getByType('EVENT_TRACKING');
    
    if (events.length === 0) return;

    try {
      // Process in batches of 10
      const batches = this.createBatches(events, 10);
      
      for (const batch of batches) {
        await this.sendEvents(batch);
        await this.offlineQueue.remove(batch.map(e => e.id));
      }
    } catch (error) {
      console.error('Failed to process event queue:', error);
      // Events will remain in queue for retry
    }
  }

  private createBatches<T>(items: T[], size: number): T[][] {
    return items.reduce((batches: T[][], item: T) => {
      const currentBatch = batches[batches.length - 1];
      
      if (!currentBatch || currentBatch.length === size) {
        batches.push([item]);
      } else {
        currentBatch.push(item);
      }
      
      return batches;
    }, []);
  }

  private async sendEvents(events: any[]): Promise<void> {
    // Implementation will depend on your backend API
    await fetch('/api/v1/events/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ events })
    });
  }
}

// Usage examples:
/*
const tracker = EventTrackingService.getInstance();

// Track medication taken
await tracker.trackEvent({
  type: 'MEDICATION_TAKEN',
  category: 'medication',
  action: 'taken',
  metadata: {
    medicationId: '123',
    dosage: '10mg',
    scheduledTime: '2024-12-12T15:00:00Z'
  },
  userId: 'user123'
});

// Track emergency contact accessed
await tracker.trackEvent({
  type: 'EMERGENCY_CONTACT_ACCESSED',
  category: 'emergency',
  action: 'accessed',
  metadata: {
    contactId: '456',
    reason: 'medication_overdose'
  },
  userId: 'user123',
  critical: true
});
*/
