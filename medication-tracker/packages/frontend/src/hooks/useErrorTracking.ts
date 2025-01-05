import { useCallback } from 'react';
import { useError } from '../contexts/ErrorContext';
import { ErrorSeverity, ErrorCategory, AppError } from '../types/errors';

interface ErrorTrackingOptions {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  recoveryAction?: () => Promise<void>;
}

export function useErrorTracking() {
  const { addError } = useError();

  const trackError = useCallback((
    error: Error | string,
    options: ErrorTrackingOptions = {}
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorObject: Omit<AppError, 'id' | 'timestamp'> = {
      message: errorMessage,
      severity: options.severity || ErrorSeverity.MEDIUM,
      category: options.category || ErrorCategory.SYSTEM,
      error: typeof error === 'string' ? new Error(error) : error,
      context: options.context,
      recoveryAction: options.recoveryAction
    };

    addError(errorObject);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error tracked:', {
        ...errorObject,
        stack: typeof error === 'string' ? undefined : error.stack
      });
    }
  }, [addError]);

  const trackPromise = useCallback(async <T,>(
    promise: Promise<T>,
    options: ErrorTrackingOptions & {
      errorMessage?: string;
    } = {}
  ): Promise<T> => {
    try {
      return await promise;
    } catch (error) {
      trackError(
        options.errorMessage || (error as Error).message,
        {
          severity: options.severity,
          category: options.category,
          context: {
            ...options.context,
            originalError: error
          },
          recoveryAction: options.recoveryAction
        }
      );
      throw error;
    }
  }, [trackError]);

  return {
    trackError,
    trackPromise
  };
}
