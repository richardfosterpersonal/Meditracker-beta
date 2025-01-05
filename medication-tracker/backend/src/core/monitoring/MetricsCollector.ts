/**
 * Metrics Collector Implementation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/core/types';
import { Metrics, MetricTags, MonitoringConfig } from './types';
import { Logger } from '@/core/logging';
import { StatsD } from 'hot-shots';

@injectable()
export class MetricsCollector implements Metrics {
    private readonly client: StatsD;

    constructor(
        @inject(TYPES.MonitoringConfig) private config: MonitoringConfig,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        this.client = new StatsD({
            prefix: config.prefix,
            globalTags: config.defaultTags,
            errorHandler: (error) => {
                this.logger.error('StatsD error', { error });
            }
        });
    }

    increment(name: string, tags?: MetricTags): void {
        if (!this.config.enabled) return;
        this.client.increment(this.sanitizeName(name), 1, this.prepareTags(tags));
    }

    decrement(name: string, tags?: MetricTags): void {
        if (!this.config.enabled) return;
        this.client.decrement(this.sanitizeName(name), 1, this.prepareTags(tags));
    }

    gauge(name: string, value: number, tags?: MetricTags): void {
        if (!this.config.enabled) return;
        this.client.gauge(this.sanitizeName(name), value, this.prepareTags(tags));
    }

    histogram(name: string, value: number, tags?: MetricTags): void {
        if (!this.config.enabled) return;
        this.client.histogram(this.sanitizeName(name), value, this.prepareTags(tags));
    }

    timing(name: string, value: number, tags?: MetricTags): void {
        if (!this.config.enabled) return;
        this.client.timing(this.sanitizeName(name), value, this.prepareTags(tags));
    }

    trackMedicationOperation(
        operation: string,
        status: string,
        duration: number,
        extraTags?: MetricTags
    ): void {
        if (!this.config.enabled) return;

        const tags = this.prepareTags({
            operation_type: operation,
            status,
            ...extraTags
        });

        this.increment('medication.operations', tags);
        this.timing('medication.operation.duration', duration, tags);
    }

    trackError(
        operation: string,
        errorType: string,
        extraTags?: MetricTags
    ): void {
        if (!this.config.enabled) return;

        const tags = this.prepareTags({
            operation,
            error_type: errorType,
            ...extraTags
        });

        this.increment('errors', tags);
    }

    private sanitizeName(name: string): string {
        // Replace invalid characters with dots
        return name.replace(/[^a-zA-Z0-9_.]/g, '_');
    }

    private prepareTags(tags?: MetricTags): MetricTags {
        if (!tags) return this.config.defaultTags;

        // Filter out any tags with sensitive data if HIPAA mode is enabled
        if (this.config.hipaaMode) {
            const safeTags: MetricTags = {};
            for (const [key, value] of Object.entries(tags)) {
                if (!this.containsSensitiveData(value)) {
                    safeTags[key] = value;
                }
            }
            return { ...this.config.defaultTags, ...safeTags };
        }

        return { ...this.config.defaultTags, ...tags };
    }

    private containsSensitiveData(value: string): boolean {
        // Add patterns to detect PHI/PII
        const phiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
            /\b\d{3}-\d{3}-\d{4}\b/, // Phone
            /\b\d{5}(?:-\d{4})?\b/, // ZIP
        ];

        return phiPatterns.some(pattern => pattern.test(value));
    }
}
