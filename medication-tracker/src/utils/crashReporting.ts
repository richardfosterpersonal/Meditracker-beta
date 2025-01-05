import * as Sentry from '@sentry/react';
import { Severity } from '@sentry/types';

interface CrashReportingConfig {
  dsn: string;
  environment: string;
  release: string;  // KEEP: Important for tracking which version had issues
}

class CrashReporter {
  private static instance: CrashReporter;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): CrashReporter {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  public initialize(config: CrashReportingConfig): void {
    if (this.initialized) return;

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,  // KEEP: Critical for version tracking
      tracesSampleRate: 0.1,
      
      beforeSend: (event) => {
        if (process.env.NODE_ENV === 'development') {
          return null;
        }

        // KEEP: Important error context for liability
        if (this.isHealthDataError(event)) {
          event.tags = {
            ...event.tags,
            involves_health_data: 'true',
            requires_immediate_attention: 'true'
          };
        }

        return this.sanitizeEventData(event);
      },
    });

    this.initialized = true;
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason);
    });

    window.addEventListener('error', (event) => {
      this.captureException(event.error);
    });
  }

  public captureException(error: Error): void {
    if (!this.initialized) return;

    // KEEP: Critical context for debugging health data issues
    const errorContext = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      componentStack: error.stack,
    };

    Sentry.captureException(error, {
      level: Severity.Error,
      tags: {
        error_type: error.name,
        error_source: 'client',
      },
      extra: errorContext
    });
  }

  // KEEP: Important for identifying health data related errors
  private isHealthDataError(event: any): boolean {
    const errorString = JSON.stringify(event).toLowerCase();
    return /health|medical|prescription|medication/i.test(errorString);
  }

  private sanitizeEventData(event: any): any {
    // KEEP: Expanded sensitive data patterns
    const sensitiveKeys = [
      'password', 'token', 'ssn', 'health',
      'medical', 'prescription', 'diagnosis'
    ];

    const sanitizeObject = (obj: any): any => {
      if (!obj) return obj;

      return Object.keys(obj).reduce((acc, key) => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(k => lowerKey.includes(k))) {
          acc[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          acc[key] = sanitizeObject(obj[key]);
        } else {
          acc[key] = obj[key];
        }
        return acc;
      }, {} as any);
    };

    return {
      ...event,
      extra: sanitizeObject(event.extra),
      request: sanitizeObject(event.request),
    };
  }

  public ErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
      <Sentry.ErrorBoundary
        fallback={() => (
          <div className="error-boundary">
            <h1>Something went wrong</h1>
            <p>We've been notified and are working to fix the issue.</p>
            <p>If this involves your health data, please contact support immediately.</p>
          </div>
        )}
      >
        {children}
      </Sentry.ErrorBoundary>
    );
  }
}
