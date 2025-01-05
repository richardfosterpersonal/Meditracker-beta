import { performance } from 'perf_hooks';
import { Logger } from 'winston';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types.js';

@injectable()
export class PerformanceMonitor {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  public trackPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.logger.info('Performance metric', {
      operation,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
}

export function monitorPerformance(operationName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        // Get the logger instance from the class
        const logger: Logger = (this as any).logger;
        if (logger) {
          logger.info('Operation performance', {
            operation: operationName,
            duration_ms: duration,
            success: true
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        const logger: Logger = (this as any).logger;
        
        if (logger) {
          logger.error('Operation failed', {
            operation: operationName,
            duration_ms: duration,
            error: error.message,
            success: false
          });
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}
