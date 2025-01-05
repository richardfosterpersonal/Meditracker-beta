import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { ApiError } from './errors.js';
import { ENVIRONMENT } from '@/config/environment.js';

/**
 * Initialize error tracking with Sentry
 * Handles HIPAA compliance by sanitizing PII
 */
export function initializeErrorTracking(): void {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not found. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      new ProfilingIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Don't send PII
    beforeSend(event) {
      // Sanitize user data
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }

      // Sanitize request data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },
  });
}

/**
 * Track an error with context
 */
export function trackError(error: Error | ApiError, context?: Record<string, any>): void {
  if (error instanceof ApiError) {
    // Don't track 4xx errors as they're client errors
    if (error.statusCode >= 500) {
      Sentry.captureException(error, {
        extra: {
          ...context,
          statusCode: error.statusCode,
        },
      });
    }
  } else {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string): void {
  Sentry.setUser({ id: userId });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}
