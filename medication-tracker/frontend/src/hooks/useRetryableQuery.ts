import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

interface RetryState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  retryCount: number;
}

export function useRetryableQuery<T>(
  queryFn: () => Promise<T>,
  config: RetryConfig = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError
  } = config;

  const [state, setState] = useState<RetryState<T>>({
    data: null,
    error: null,
    loading: true,
    retryCount: 0
  });

  const executeQuery = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await queryFn();
      setState({
        data: result,
        error: null,
        loading: false,
        retryCount: 0
      });
    } catch (error) {
      const isAxiosError = error instanceof AxiosError;
      const shouldRetry = state.retryCount < maxRetries && 
        (!isAxiosError || (error.response?.status || 500) >= 500);

      if (shouldRetry) {
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1
          }));
        }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
      } else {
        setState(prev => ({
          ...prev,
          error: error as Error,
          loading: false
        }));
        onError?.(error as Error);
      }
    }
  }, [queryFn, maxRetries, retryDelay, state.retryCount, onError]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      retryCount: 0,
      loading: true
    }));
  }, []);

  return {
    ...state,
    retry
  };
}
