import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { BrowserTracing } from '@sentry/browser';
import { RewriteFrames } from '@sentry/integrations';
import { Severity } from '@sentry/types';
import { reportWebVitals } from '../../reportWebVitals';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface ErrorReport {
  error: Error;
  componentStack?: string;
  severity?: Severity;
  tags?: Record<string, string>;
  extras?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private performanceMetrics: PerformanceMetrics = {
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
  };

  private constructor() {
    this.initializeSentry();
    this.initializePerformanceMonitoring();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeSentry() {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [
        new BrowserTracing({
          tracingOrigins: ['localhost', 'medication-tracker.com'],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            // @ts-ignore - React Router history
            window.history
          ),
        }),
        new Integrations.BrowserTracing(),
        new RewriteFrames({
          root: process.env.NODE_ENV === 'production' ? '/app' : '/',
        }),
      ],
      environment: process.env.NODE_ENV,
      release: process.env.REACT_APP_VERSION,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        return event;
      },
    });
  }

  private initializePerformanceMonitoring() {
    reportWebVitals(({ name, value, id }) => {
      switch (name) {
        case 'FCP':
          this.performanceMetrics.fcp = value;
          break;
        case 'LCP':
          this.performanceMetrics.lcp = value;
          break;
        case 'FID':
          this.performanceMetrics.fid = value;
          break;
        case 'CLS':
          this.performanceMetrics.cls = value;
          break;
        case 'TTFB':
          this.performanceMetrics.ttfb = value;
          break;
      }

      // Report to Sentry
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${name}: ${value}`,
        level: 'info',
      });

      // Send to analytics if thresholds are exceeded
      this.checkPerformanceThresholds(name, value);
    });
  }

  private checkPerformanceThresholds(metric: string, value: number) {
    const thresholds = {
      FCP: 2000, // 2 seconds
      LCP: 2500, // 2.5 seconds
      FID: 100,  // 100 milliseconds
      CLS: 0.1,  // 0.1
      TTFB: 600, // 600 milliseconds
    };

    if (value > thresholds[metric as keyof typeof thresholds]) {
      this.captureMessage(
        `Performance threshold exceeded for ${metric}: ${value}`,
        'warning'
      );
    }
  }

  public captureError({ 
    error, 
    componentStack, 
    severity = Severity.Error, 
    tags = {}, 
    extras = {} 
  }: ErrorReport) {
    Sentry.withScope((scope) => {
      scope.setLevel(severity);
      
      // Add component stack if available
      if (componentStack) {
        scope.setContext('react', { componentStack });
      }

      // Add tags and extras
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });

      // Add performance metrics context
      scope.setContext('performance', this.performanceMetrics);

      Sentry.captureException(error);
    });
  }

  public captureMessage(message: string, level: Severity = Severity.Info) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setContext('performance', this.performanceMetrics);
      Sentry.captureMessage(message);
    });
  }

  public setUser(user: { id: string; email?: string; username?: string }) {
    Sentry.setUser(user);
  }

  public clearUser() {
    Sentry.setUser(null);
  }

  public addBreadcrumb(
    message: string,
    category?: string,
    level: Severity = Severity.Info
  ) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now(),
    });
  }

  public startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  public setTags(tags: Record<string, string>) {
    Object.entries(tags).forEach(([key, value]) => {
      this.setTag(key, value);
    });
  }
}

export const monitoring = MonitoringService.getInstance();
export type { PerformanceMetrics, ErrorReport };
