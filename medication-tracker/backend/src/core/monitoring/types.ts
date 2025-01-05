/**
 * Monitoring System Types
 */

export interface MetricTags {
    [key: string]: string;
}

export interface Metrics {
    increment(name: string, tags?: MetricTags): void;
    decrement(name: string, tags?: MetricTags): void;
    gauge(name: string, value: number, tags?: MetricTags): void;
    histogram(name: string, value: number, tags?: MetricTags): void;
    timing(name: string, value: number, tags?: MetricTags): void;
}

export interface SecurityMetrics extends Metrics {
    trackAuthAttempt(success: boolean, tags?: MetricTags): void;
    trackAccessAttempt(resource: string, success: boolean, tags?: MetricTags): void;
    trackValidationFailure(type: string, tags?: MetricTags): void;
}

export interface MonitoringConfig {
    enabled: boolean;
    prefix: string;
    defaultTags: MetricTags;
    flushInterval: number;
    hipaaMode: boolean;
}

export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
    phi?: boolean;
}

export interface LoggerConfig {
    level: string;
    hipaaMode: boolean;
    phiPatterns?: Record<string, RegExp>;
}
