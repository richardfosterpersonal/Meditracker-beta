/**
 * Analytics System Types
 */

export enum AnalyticsEventType {
    // Medication Events
    MEDICATION_TAKEN = 'medication_taken',
    MEDICATION_MISSED = 'medication_missed',
    MEDICATION_SKIPPED = 'medication_skipped',
    MEDICATION_REFILLED = 'medication_refilled',

    // Reminder Events
    REMINDER_SENT = 'reminder_sent',
    REMINDER_ACKNOWLEDGED = 'reminder_acknowledged',
    REMINDER_IGNORED = 'reminder_ignored',

    // Interaction Events
    INTERACTION_DETECTED = 'interaction_detected',
    INTERACTION_RESOLVED = 'interaction_resolved',
    INTERACTION_IGNORED = 'interaction_ignored',

    // System Events
    ERROR_OCCURRED = 'error_occurred',
    PERFORMANCE_METRIC = 'performance_metric',
    SECURITY_EVENT = 'security_event'
}

export enum TimeRange {
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year'
}

export enum AggregationType {
    COUNT = 'count',
    SUM = 'sum',
    AVERAGE = 'average',
    MIN = 'min',
    MAX = 'max'
}

export interface AnalyticsEvent {
    eventType: AnalyticsEventType;
    timestamp: Date;
    userId?: string;
    medicationId?: string;
    metadata: Record<string, any>;
}

export interface AnalyticsQuery {
    eventType?: AnalyticsEventType;
    startTime: Date;
    endTime: Date;
    userId?: string;
    medicationId?: string;
    aggregation: AggregationType;
    timeRange: TimeRange;
}

export interface AnalyticsResult {
    timeRange: TimeRange;
    aggregationType: AggregationType;
    data: Array<{
        timestamp: Date;
        value: number;
    }>;
    metadata: {
        totalCount: number;
        uniqueUsers?: number;
        uniqueMedications?: number;
    };
}

export interface AdherenceMetrics {
    userId: string;
    medicationId: string;
    period: TimeRange;
    takenCount: number;
    missedCount: number;
    skippedCount: number;
    adherenceRate: number;
    lastTaken?: Date;
}

export interface RefillMetrics {
    userId: string;
    medicationId: string;
    period: TimeRange;
    refillCount: number;
    averageRefillInterval: number;
    lastRefill?: Date;
    predictedNextRefill?: Date;
}

export interface InteractionMetrics {
    userId: string;
    period: TimeRange;
    totalInteractions: number;
    resolvedCount: number;
    ignoredCount: number;
    averageResolutionTime: number;
}

export interface SystemMetrics {
    period: TimeRange;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    uniqueUsers: number;
    totalEvents: number;
}

export interface ExportOptions {
    format: 'csv' | 'json' | 'pdf';
    includeMetadata: boolean;
    anonymize: boolean;
    compression?: boolean;
}

export interface AnalyticsCache {
    key: string;
    data: any;
    expiresAt: Date;
}
