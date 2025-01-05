/**
 * Metrics Hook
 * Implements frontend metrics collection
 * Compliant with SINGLE_SOURCE_VALIDATION.md
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { ValidationError } from '../types/validation';

export enum MetricType {
  USAGE = 'usage',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

export enum MetricPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

interface MetricOptions {
  priority?: MetricPriority;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetric {
  component: string;
  action: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

interface UsageMetric {
  feature: string;
  action: string;
  metadata?: Record<string, unknown>;
}

interface SecurityMetric {
  eventType: string;
  status: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook for tracking metrics in frontend components
 */
export const useMetrics = () => {
  const { user } = useAuth();
  const metricsBuffer = useRef<Array<Record<string, unknown>>>([]);
  const bufferTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process buffered metrics
   */
  const processMetrics = useCallback(async () => {
    if (metricsBuffer.current.length === 0) return;

    try {
      const response = await fetch('/api/metrics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsBuffer.current,
        }),
      });

      if (!response.ok) {
        throw new ValidationError('Failed to process metrics');
      }

      // Clear buffer after successful processing
      metricsBuffer.current = [];
    } catch (error) {
      console.error('Error processing metrics:', error);
    }
  }, []);

  /**
   * Buffer metric for batch processing
   */
  const bufferMetric = useCallback((
    metric: Record<string, unknown>,
    options?: MetricOptions
  ) => {
    metricsBuffer.current.push({
      ...metric,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      priority: options?.priority || MetricPriority.MEDIUM,
      metadata: options?.metadata,
    });

    // Process immediately if high priority
    if (options?.priority === MetricPriority.HIGH) {
      processMetrics();
      return;
    }

    // Schedule processing if not already scheduled
    if (!bufferTimeout.current) {
      bufferTimeout.current = setTimeout(() => {
        processMetrics();
        bufferTimeout.current = null;
      }, 5000); // Process every 5 seconds
    }
  }, [user, processMetrics]);

  /**
   * Track performance metric
   */
  const trackPerformance = useCallback((
    metric: PerformanceMetric,
    options?: MetricOptions
  ) => {
    bufferMetric({
      type: MetricType.PERFORMANCE,
      ...metric,
    }, {
      priority: MetricPriority.HIGH,
      ...options,
    });
  }, [bufferMetric]);

  /**
   * Track usage metric
   */
  const trackUsage = useCallback((
    metric: UsageMetric,
    options?: MetricOptions
  ) => {
    bufferMetric({
      type: MetricType.USAGE,
      ...metric,
    }, options);
  }, [bufferMetric]);

  /**
   * Track security metric
   */
  const trackSecurity = useCallback((
    metric: SecurityMetric,
    options?: MetricOptions
  ) => {
    bufferMetric({
      type: MetricType.SECURITY,
      ...metric,
    }, {
      priority: MetricPriority.HIGH,
      ...options,
    });
  }, [bufferMetric]);

  /**
   * Performance measurement HOC
   */
  const measurePerformance = useCallback(<T extends (...args: any[]) => any>(
    component: string,
    action: string,
    fn: T,
    options?: MetricOptions
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);

      // Handle both sync and async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          trackPerformance({
            component,
            action,
            duration,
          }, options);
        });
      }

      const duration = performance.now() - start;
      trackPerformance({
        component,
        action,
        duration,
      }, options);
      return result;
    }) as T;
  }, [trackPerformance]);

  // Process remaining metrics on unmount
  useEffect(() => {
    return () => {
      if (bufferTimeout.current) {
        clearTimeout(bufferTimeout.current);
      }
      processMetrics();
    };
  }, [processMetrics]);

  return {
    trackPerformance,
    trackUsage,
    trackSecurity,
    measurePerformance,
  };
};

/**
 * HOC for adding performance tracking to components
 */
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.FC<P> => {
  return (props) => {
    const { measurePerformance } = useMetrics();

    // Wrap render function with performance tracking
    const render = measurePerformance(
      componentName,
      'render',
      () => <WrappedComponent {...props} />,
      { priority: MetricPriority.HIGH }
    );

    return render();
  };
};
