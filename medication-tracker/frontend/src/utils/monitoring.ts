import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { Integrations } from '@sentry/react';
import { AuditLogger } from './auditLog';

interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private initialized = false;

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  initialize(dsn: string, environment: string = 'production') {
    if (this.initialized) return;

    Sentry.init({
      dsn,
      environment,
      integrations: [
        new BrowserTracing(),
        new Integrations.BrowserTracing({
          tracingOrigins: ['localhost', /^\//, /^https:\/\//],
        }),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
        }
        return event;
      },
    });

    this.initialized = true;
  }

  async captureError(error: Error, context?: ErrorContext) {
    if (!this.initialized) {
      console.warn('Monitoring service not initialized');
      return;
    }

    try {
      // Log to audit system
      if (context?.userId) {
        await AuditLogger.log(
          'error_occurred',
          context.userId,
          {
            error: error.message,
            stack: error.stack,
            component: context.component,
            action: context.action,
            metadata: context.metadata,
          },
          'error'
        );
      }

      // Send to Sentry
      Sentry.withScope((scope) => {
        if (context) {
          if (context.userId) scope.setUser({ id: context.userId });
          if (context.component) scope.setTag('component', context.component);
          if (context.action) scope.setTag('action', context.action);
          if (context.metadata) scope.setExtras(context.metadata);
        }
        Sentry.captureException(error);
      });
    } catch (e) {
      console.error('Failed to capture error:', e);
    }
  }

  setUser(userId: string) {
    if (!this.initialized) return;
    Sentry.setUser({ id: userId });
  }

  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  startTransaction(name: string, op: string) {
    if (!this.initialized) return null;
    return Sentry.startTransaction({ name, op });
  }

  setTag(key: string, value: string) {
    if (!this.initialized) return;
    Sentry.setTag(key, value);
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return;
    Sentry.captureMessage(message, level);
  }
}

export const monitoring = MonitoringService.getInstance();
