import { useEffect, useRef } from 'react';
import { monitoring } from '../services/monitoring/MonitoringService';
import { logging } from '../services/monitoring/LoggingService';

interface PerformanceOptions {
  componentName: string;
  trackRender?: boolean;
  trackInteractions?: boolean;
  trackMemory?: boolean;
  interactionThreshold?: number;
  renderThreshold?: number;
}

export function usePerformanceMonitoring({
  componentName,
  trackRender = true,
  trackInteractions = true,
  trackMemory = false,
  interactionThreshold = 100,
  renderThreshold = 16, // ~1 frame at 60fps
}: PerformanceOptions) {
  const renderStartTime = useRef<number>(0);
  const interactionStartTime = useRef<number>(0);

  useEffect(() => {
    if (trackRender) {
      renderStartTime.current = performance.now();
      
      return () => {
        const renderDuration = performance.now() - renderStartTime.current;
        if (renderDuration > renderThreshold) {
          logging.warn(`Slow render in ${componentName}`, {
            context: { duration: renderDuration },
            tags: { component: componentName, type: 'render' },
          });
        }

        monitoring.addBreadcrumb(
          `Component rendered: ${componentName}`,
          'performance'
        );
      };
    }
  }, [componentName, trackRender, renderThreshold]);

  useEffect(() => {
    if (trackMemory && (window.performance as any).memory) {
      const interval = setInterval(() => {
        const memory = (window.performance as any).memory;
        const usedHeapSize = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        const totalHeapSize = memory.totalJSHeapSize / (1024 * 1024);
        const heapLimit = memory.jsHeapSizeLimit / (1024 * 1024);

        if (usedHeapSize / heapLimit > 0.9) {
          logging.warn(`High memory usage in ${componentName}`, {
            context: {
              usedHeapSize,
              totalHeapSize,
              heapLimit,
            },
            tags: { component: componentName, type: 'memory' },
          });
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [componentName, trackMemory]);

  const trackInteraction = (interactionName: string) => {
    if (!trackInteractions) return;

    interactionStartTime.current = performance.now();
    
    return () => {
      const duration = performance.now() - interactionStartTime.current;
      if (duration > interactionThreshold) {
        logging.warn(`Slow interaction in ${componentName}: ${interactionName}`, {
          context: { duration },
          tags: { component: componentName, interaction: interactionName },
        });
      }

      monitoring.addBreadcrumb(
        `User interaction: ${interactionName} in ${componentName}`,
        'interaction'
      );
    };
  };

  const measureAsyncOperation = async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    const transaction = monitoring.startTransaction(
      `${componentName}:${operationName}`,
      'operation'
    );

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      if (duration > interactionThreshold) {
        logging.warn(`Slow async operation in ${componentName}: ${operationName}`, {
          context: { duration },
          tags: { component: componentName, operation: operationName },
        });
      }

      return result;
    } catch (error) {
      logging.error(`Failed async operation in ${componentName}: ${operationName}`, {
        context: { error },
        tags: { component: componentName, operation: operationName },
      });
      throw error;
    } finally {
      transaction?.finish();
    }
  };

  return {
    trackInteraction,
    measureAsyncOperation,
  };
}
