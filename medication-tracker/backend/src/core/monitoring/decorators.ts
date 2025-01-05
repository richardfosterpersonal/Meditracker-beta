/**
 * Monitoring Decorators
 */

import { container } from '@/core/container';
import { TYPES } from '@/core/types';
import { MetricsCollector } from './MetricsCollector';
import { Logger } from '@/core/logging';

/**
 * Monitor method execution with metrics
 */
export function monitor(metricName: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const metrics = container.get<MetricsCollector>(TYPES.MetricsCollector);
        const logger = container.get<Logger>(TYPES.Logger);

        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            let success = true;

            try {
                const result = await originalMethod.apply(this, args);
                return result;
            } catch (error) {
                success = false;
                metrics.trackError(metricName, error.name, {
                    method: propertyKey,
                    message: error.message
                });
                logger.error(`Error in ${metricName}`, {
                    method: propertyKey,
                    error
                });
                throw error;
            } finally {
                const duration = Date.now() - start;
                metrics.timing(metricName, duration, {
                    method: propertyKey,
                    success: success.toString()
                });
            }
        };

        return descriptor;
    };
}

/**
 * Track method execution time
 */
export function trackTiming(metricName: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const metrics = container.get<MetricsCollector>(TYPES.MetricsCollector);

        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - start;

            metrics.timing(metricName, duration);
            return result;
        };

        return descriptor;
    };
}

/**
 * Log method execution
 */
export function logMethod(level: string = 'info') {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const logger = container.get<Logger>(TYPES.Logger);

        descriptor.value = async function (...args: any[]) {
            const className = target.constructor.name;
            logger[level](`${className}.${propertyKey} called`, {
                args: args.map(arg => 
                    typeof arg === 'object' ? '[Object]' : arg
                )
            });

            try {
                const result = await originalMethod.apply(this, args);
                logger[level](`${className}.${propertyKey} completed`);
                return result;
            } catch (error) {
                logger.error(`${className}.${propertyKey} failed`, { error });
                throw error;
            }
        };

        return descriptor;
    };
}
