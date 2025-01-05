import api from '../api/api';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeData } from '../utils/sanitizer';
import { dataSanitizationRules } from '../config/hipaa-compliance';
import { getOfflineStorage } from './storage/offlineStorage';

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

interface PerformanceMetric {
  metricName: string;
  value: number;
  timestamp?: string;
}

export class AnalyticsService {
  private sessionId: string | null = null;
  private initialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initSession();
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.setupOfflineSupport();
  }

  private async initSession() {
    if (this.initialized) return;
    
    try {
      const platform = this.getPlatformInfo();
      const deviceType = this.getDeviceType();
      const response = await api.post('/api/analytics/session/start', {
        userAgent: navigator.userAgent,
        platform,
        deviceType
      });
      
      this.sessionId = response.data.sessionId;
      this.initialized = true;

      // Set up session cleanup
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      
      // Start event queue processing
      this.processEventQueue();
    } catch (error) {
      console.error('Failed to initialize analytics session:', error);
    }
  }

  private handleBeforeUnload = () => {
    if (this.sessionId) {
      // Flush any remaining events
      this.flushEvents(true);
      
      // End session
      navigator.sendBeacon(
        '/api/analytics/session/end',
        JSON.stringify({ sessionId: this.sessionId })
      );
    }
  };

  private async sanitizeEventData(data: Record<string, any>): Promise<Record<string, any>> {
    try {
      const sanitizedData = { ...data };
      
      // Apply HIPAA compliance rules
      for (const [key, rules] of Object.entries(dataSanitizationRules)) {
        if (key in sanitizedData) {
          sanitizedData[key] = sanitizeData(sanitizedData[key], rules);
        }
      }

      return sanitizedData;
    } catch (error) {
      console.error('Error sanitizing event data:', error);
      return {}; // Return empty object on error to prevent data leaks
    }
  }

  private async processEventQueue() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(immediate = false) {
    if (!this.sessionId || (!immediate && this.eventQueue.length < this.BATCH_SIZE)) {
      return;
    }

    const events = this.eventQueue.splice(0, this.BATCH_SIZE);
    if (events.length === 0) return;

    try {
      await api.post('/api/analytics/events/batch', {
        sessionId: this.sessionId,
        events: events
      });
    } catch (error) {
      // On failure, add events back to queue
      this.eventQueue.unshift(...events);
      
      // Store failed events offline
      const offlineStorage = await getOfflineStorage();
      await offlineStorage.storeFailedEvents(events);
    }

    // Continue processing if there are more events
    if (this.eventQueue.length > 0) {
      this.processEventQueue();
    }
  }

  private setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      const performance = window.performance;
      if (performance) {
        const timing = performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const domLoadTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        this.trackPerformance('pageLoadTime', pageLoadTime);
        this.trackPerformance('domLoadTime', domLoadTime);
      }
    });

    // Track client-side navigation performance using Performance Observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackPerformance('navigationTime', entry.duration);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        errorType: 'runtime',
        errorMessage: event.message,
        stackTrace: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        errorType: 'promise',
        errorMessage: event.reason?.message || 'Unhandled Promise Rejection',
        stackTrace: event.reason?.stack
      });
    });
  }

  private setupOfflineSupport() {
    // Implement offline support
  }

  private getPlatformInfo(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('linux')) return 'linux';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('ios')) return 'ios';
    return 'unknown';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  public async trackEvent(params: {
    eventName: string;
    properties?: Record<string, any>;
  }) {
    try {
      const sanitizedData = await this.sanitizeEventData(params);
      this.eventQueue.push({
        eventName: sanitizedData.eventName,
        properties: sanitizedData.properties,
        timestamp: new Date().toISOString()
      });
      this.processEventQueue();
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  public async trackPerformance(metricName: string, value: number) {
    try {
      this.eventQueue.push({
        eventName: metricName,
        properties: { value },
        timestamp: new Date().toISOString()
      });
      this.processEventQueue();
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }

  public async trackError(params: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
  }) {
    try {
      const sanitizedData = await this.sanitizeEventData(params);
      this.eventQueue.push({
        eventName: 'error',
        properties: sanitizedData,
        timestamp: new Date().toISOString()
      });
      this.processEventQueue();
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  public async trackPageView(pathname: string) {
    if (!this.sessionId) return;
    
    try {
      await Promise.all([
        this.trackEvent({
          eventName: 'page_view',
          properties: { path: pathname }
        }),
        api.post('/api/analytics/session/page-view', {
          sessionId: this.sessionId
        })
      ]);
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }
}

export const analytics = new AnalyticsService();
