import { monitoring } from './monitoring';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metricsBuffer: PerformanceMetric[] = [];
  private readonly bufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupWebVitalsMonitoring();
    this.setupPerformanceObserver();
    this.startPeriodicFlush();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  private setupWebVitalsMonitoring() {
    if ('web-vitals' in window) {
      import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB }) => {
        onCLS(this.handleWebVitals);
        onFID(this.handleWebVitals);
        onLCP(this.handleWebVitals);
        onFCP(this.handleWebVitals);
        onTTFB(this.handleWebVitals);
      });
    }
  }

  private handleWebVitals = (metric: WebVitalsMetric) => {
    this.recordMetric({
      name: `web_vitals_${metric.name.toLowerCase()}`,
      value: metric.value,
      unit: this.getWebVitalsUnit(metric.name),
      tags: {
        rating: metric.rating,
      },
    });
  };

  private getWebVitalsUnit(metricName: string): string {
    switch (metricName) {
      case 'CLS':
        return 'unitless';
      case 'FID':
      case 'LCP':
      case 'FCP':
      case 'TTFB':
        return 'ms';
      default:
        return 'unknown';
    }
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.recordResourceTiming(entry as PerformanceResourceTiming);
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });

      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
    }
  }

  private recordResourceTiming(entry: PerformanceResourceTiming) {
    const urlParts = new URL(entry.name);
    const resourceType = entry.initiatorType || 'unknown';

    this.recordMetric({
      name: 'resource_load_time',
      value: entry.duration,
      unit: 'ms',
      tags: {
        resource_type: resourceType,
        host: urlParts.hostname,
        path: urlParts.pathname,
      },
    });
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming) {
    this.recordMetric({
      name: 'page_load_time',
      value: entry.loadEventEnd - entry.startTime,
      unit: 'ms',
      tags: {
        type: 'navigation',
        path: window.location.pathname,
      },
    });
  }

  recordMetric(metric: PerformanceMetric) {
    this.metricsBuffer.push(metric);

    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000); // Flush every 30 seconds
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Send metrics to monitoring service
      const transaction = monitoring.startTransaction('flush_metrics', 'monitoring');
      
      metrics.forEach(metric => {
        monitoring.captureMessage(`Performance metric: ${metric.name}`, 'info');
      });

      if (transaction) transaction.finish();

      // You can also send metrics to your analytics service here
      // await analyticsService.sendMetrics(metrics);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Put the metrics back in the buffer
      this.metricsBuffer = [...metrics, ...this.metricsBuffer];
    }
  }

  measureAsyncOperation(name: string, operation: () => Promise<any>, tags?: Record<string, string>) {
    const startTime = performance.now();
    
    return operation().finally(() => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name: `async_operation_${name}`,
        value: duration,
        unit: 'ms',
        tags,
      });
    });
  }

  measureSyncOperation(name: string, operation: () => any, tags?: Record<string, string>) {
    const startTime = performance.now();
    
    try {
      return operation();
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name: `sync_operation_${name}`,
        value: duration,
        unit: 'ms',
        tags,
      });
    }
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics();
  }
}

export const performanceMonitoring = PerformanceMonitoringService.getInstance();
