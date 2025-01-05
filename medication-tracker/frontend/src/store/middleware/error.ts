import { Middleware } from '@reduxjs/toolkit';
import { ValidationError } from '../../../../shared/types';

// Error categories
const AUTH_ERRORS = ['auth/login', 'auth/register', 'auth/refresh'];
const MEDICATION_ERRORS = ['medication/create', 'medication/update', 'medication/delete'];
const NETWORK_ERRORS = ['Network Error', 'ECONNREFUSED', 'TIMEOUT'];

interface ErrorHandlerConfig {
  shouldRetry: boolean;
  maxRetries: number;
  notifyUser: boolean;
  logToServer: boolean;
}

const defaultConfig: ErrorHandlerConfig = {
  shouldRetry: false,
  maxRetries: 3,
  notifyUser: true,
  logToServer: true,
};

const errorConfigs: Record<string, ErrorHandlerConfig> = {
  // Auth errors
  'auth/invalid-credentials': {
    ...defaultConfig,
    shouldRetry: false,
    notifyUser: true,
    logToServer: false,
  },
  'auth/token-expired': {
    ...defaultConfig,
    shouldRetry: true,
    maxRetries: 1,
    notifyUser: false,
    logToServer: true,
  },

  // Medication errors
  'medication/validation-error': {
    ...defaultConfig,
    shouldRetry: false,
    notifyUser: true,
    logToServer: true,
  },
  'medication/conflict': {
    ...defaultConfig,
    shouldRetry: false,
    notifyUser: true,
    logToServer: true,
  },

  // Network errors
  'network/timeout': {
    ...defaultConfig,
    shouldRetry: true,
    maxRetries: 3,
    notifyUser: true,
    logToServer: true,
  },
  'network/offline': {
    ...defaultConfig,
    shouldRetry: false,
    notifyUser: true,
    logToServer: false,
  },
};

class ErrorHandler {
  private retryCount: Record<string, number> = {};

  public handleError(error: ValidationError, actionType: string): void {
    const config = this.getErrorConfig(error.code);
    const retryKey = `${actionType}-${error.code}`;

    if (config.logToServer) {
      this.logErrorToServer(error, actionType);
    }

    if (config.notifyUser) {
      this.notifyUser(error);
    }

    if (config.shouldRetry && this.canRetry(retryKey, config.maxRetries)) {
      this.retryAction(actionType, error);
    }
  }

  private getErrorConfig(errorCode: string): ErrorHandlerConfig {
    return errorConfigs[errorCode] || defaultConfig;
  }

  private canRetry(key: string, maxRetries: number): boolean {
    this.retryCount[key] = (this.retryCount[key] || 0) + 1;
    return this.retryCount[key] <= maxRetries;
  }

  private async logErrorToServer(error: ValidationError, actionType: string): Promise<void> {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        errorCode: error.code,
        message: error.message,
        actionType,
        details: error.details,
      };

      // Send error log to your error tracking service
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog),
      });
    } catch (e) {
      console.error('Failed to log error to server:', e);
    }
  }

  private notifyUser(error: ValidationError): void {
    // Dispatch a notification action
    // This should be implemented based on your notification system
    console.error('User notification:', error.message);
  }

  private retryAction(actionType: string, error: ValidationError): void {
    // Implement retry logic
    console.log(`Retrying action ${actionType} due to error:`, error);
  }
}

const errorHandler = new ErrorHandler();

export const errorMiddleware: Middleware = () => (next) => (action) => {
  // Only handle rejected actions
  if (!action.type.endsWith('/rejected') || !action.error) {
    return next(action);
  }

  const baseType = action.type.replace('/rejected', '');
  const error = action.error as ValidationError;

  errorHandler.handleError(error, baseType);

  return next(action);
};
