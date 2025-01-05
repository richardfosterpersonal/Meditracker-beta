/**
 * Security Metrics Implementation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/core/types';
import { SecurityMetrics as ISecurityMetrics, MetricTags } from './types';
import { MetricsCollector } from './MetricsCollector';

@injectable()
export class SecurityMetrics implements ISecurityMetrics {
    constructor(
        @inject(TYPES.MetricsCollector) private metrics: MetricsCollector
    ) {}

    increment(name: string, tags?: MetricTags): void {
        this.metrics.increment(`security.${name}`, tags);
    }

    decrement(name: string, tags?: MetricTags): void {
        this.metrics.decrement(`security.${name}`, tags);
    }

    gauge(name: string, value: number, tags?: MetricTags): void {
        this.metrics.gauge(`security.${name}`, value, tags);
    }

    histogram(name: string, value: number, tags?: MetricTags): void {
        this.metrics.histogram(`security.${name}`, value, tags);
    }

    timing(name: string, value: number, tags?: MetricTags): void {
        this.metrics.timing(`security.${name}`, value, tags);
    }

    trackAuthAttempt(success: boolean, tags?: MetricTags): void {
        const status = success ? 'success' : 'failure';
        this.increment('auth.attempt', { ...tags, status });

        if (!success) {
            this.increment('auth.failure', tags);
        }
    }

    trackAccessAttempt(resource: string, success: boolean, tags?: MetricTags): void {
        const status = success ? 'success' : 'failure';
        this.increment('access.attempt', { ...tags, resource, status });

        if (!success) {
            this.increment('access.failure', { ...tags, resource });
        }
    }

    trackValidationFailure(type: string, tags?: MetricTags): void {
        this.increment('validation.failure', { ...tags, type });
    }
}
