import analytics, { AnalyticEvents } from './analytics';

// Security-specific event names
export const SECURITY_EVENTS = {
  // Encryption events
  KEY_ROTATION_STARTED: 'key_rotation_started',
  KEY_ROTATION_COMPLETED: 'key_rotation_completed',
  KEY_ROTATION_FAILED: 'key_rotation_failed',
  ENCRYPTION_PERFORMED: 'encryption_performed',
  DECRYPTION_PERFORMED: 'decryption_performed',
  ENCRYPTION_ERROR: 'encryption_error',
  
  // Notification events
  NOTIFICATION_ENCRYPTED: 'notification_encrypted',
  NOTIFICATION_DECRYPTED: 'notification_decrypted',
  NOTIFICATION_DELIVERY_ATTEMPTED: 'notification_delivery_attempted',
  NOTIFICATION_DELIVERED: 'notification_delivered',
  NOTIFICATION_FAILED: 'notification_failed',
  
  // Performance events
  ENCRYPTION_PERFORMANCE: 'encryption_performance',
  KEY_ROTATION_PERFORMANCE: 'key_rotation_performance',
  NOTIFICATION_PERFORMANCE: 'notification_performance',
} as const;

interface PerformanceMetrics {
  duration: number;
  success: boolean;
  retryCount?: number;
  errorType?: string;
}

class SecurityAnalytics {
  private static startTime: Record<string, number> = {};

  // Key Rotation Analytics
  static trackKeyRotation(status: 'started' | 'completed' | 'failed', details?: Record<string, any>) {
    const event = status === 'started' 
      ? SECURITY_EVENTS.KEY_ROTATION_STARTED
      : status === 'completed'
        ? SECURITY_EVENTS.KEY_ROTATION_COMPLETED
        : SECURITY_EVENTS.KEY_ROTATION_FAILED;

    analytics.trackEvent(event, {
      category: AnalyticEvents.FEATURE_USAGE,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  // Encryption Analytics
  static trackEncryption(type: 'encryption' | 'decryption', metrics: PerformanceMetrics) {
    const event = type === 'encryption'
      ? SECURITY_EVENTS.ENCRYPTION_PERFORMED
      : SECURITY_EVENTS.DECRYPTION_PERFORMED;

    analytics.trackEvent(event, {
      category: AnalyticEvents.FEATURE_USAGE,
      duration: metrics.duration,
      success: metrics.success,
      retryCount: metrics.retryCount,
      errorType: metrics.errorType,
      timestamp: new Date().toISOString(),
    });
  }

  // Notification Analytics
  static trackNotification(status: 'encrypted' | 'decrypted' | 'attempted' | 'delivered' | 'failed', details: Record<string, any>) {
    const eventMap = {
      encrypted: SECURITY_EVENTS.NOTIFICATION_ENCRYPTED,
      decrypted: SECURITY_EVENTS.NOTIFICATION_DECRYPTED,
      attempted: SECURITY_EVENTS.NOTIFICATION_DELIVERY_ATTEMPTED,
      delivered: SECURITY_EVENTS.NOTIFICATION_DELIVERED,
      failed: SECURITY_EVENTS.NOTIFICATION_FAILED,
    };

    analytics.trackEvent(eventMap[status], {
      category: AnalyticEvents.FEATURE_USAGE,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  // Performance Tracking
  static startTracking(operationType: string): void {
    this.startTime[operationType] = performance.now();
  }

  static endTracking(operationType: string, success: boolean = true, details: Record<string, any> = {}): void {
    const startTime = this.startTime[operationType];
    if (!startTime) return;

    const duration = performance.now() - startTime;
    delete this.startTime[operationType];

    const eventMap = {
      encryption: SECURITY_EVENTS.ENCRYPTION_PERFORMANCE,
      keyRotation: SECURITY_EVENTS.KEY_ROTATION_PERFORMANCE,
      notification: SECURITY_EVENTS.NOTIFICATION_PERFORMANCE,
    };

    analytics.trackEvent(eventMap[operationType as keyof typeof eventMap], {
      category: AnalyticEvents.FEATURE_USAGE,
      duration,
      success,
      ...details,
    });
  }

  // Aggregate Metrics
  static async getAggregateMetrics(): Promise<Record<string, any>> {
    // This would typically fetch from your analytics backend
    // For now, we'll return mock data
    return {
      totalEncryptions: 0,
      averageEncryptionTime: 0,
      failureRate: 0,
      keyRotations: 0,
      notificationDeliveryRate: 0,
    };
  }
}

export default SecurityAnalytics;
