/**
 * Background Jobs Type Definitions
 */

import { Job, Queue, JobOptions } from 'bull';
import { Medication } from '@/models/Medication';
import { User } from '@/models/User';
import { Notification } from '@/services/notification/types';

/**
 * Job Names
 */
export enum JobName {
    MEDICATION_REMINDER = 'medication-reminder',
    REFILL_CHECK = 'refill-check',
    INTERACTION_CHECK = 'interaction-check',
    NOTIFICATION_CLEANUP = 'notification-cleanup',
    METRICS_ROLLUP = 'metrics-rollup',
    ERROR_CLEANUP = 'error-cleanup'
}

/**
 * Job Priorities
 */
export enum JobPriority {
    HIGH = 1,
    MEDIUM = 2,
    LOW = 3
}

/**
 * Base Job Data Interface
 */
export interface BaseJobData {
    jobId: string;
    priority: JobPriority;
    createdAt: Date;
    attempts: number;
}

/**
 * Medication Reminder Job
 */
export interface MedicationReminderData extends BaseJobData {
    userId: string;
    medicationId: string;
    scheduledTime: Date;
    dosage: string;
    instructions?: string;
}

/**
 * Refill Check Job
 */
export interface RefillCheckData extends BaseJobData {
    userId: string;
    medicationId: string;
    currentSupply: number;
    threshold: number;
}

/**
 * Interaction Check Job
 */
export interface InteractionCheckData extends BaseJobData {
    userId: string;
    medications: string[];
    checkType: 'new' | 'scheduled';
}

/**
 * Notification Cleanup Job
 */
export interface NotificationCleanupData extends BaseJobData {
    olderThan: Date;
    types: string[];
    excludeIds?: string[];
}

/**
 * Metrics Rollup Job
 */
export interface MetricsRollupData extends BaseJobData {
    metricTypes: string[];
    startTime: Date;
    endTime: Date;
    resolution: 'hour' | 'day' | 'week';
}

/**
 * Error Cleanup Job
 */
export interface ErrorCleanupData extends BaseJobData {
    olderThan: Date;
    errorTypes?: string[];
    excludeIds?: string[];
}

/**
 * Job Data Union Type
 */
export type JobData = 
    | MedicationReminderData
    | RefillCheckData
    | InteractionCheckData
    | NotificationCleanupData
    | MetricsRollupData
    | ErrorCleanupData;

/**
 * Job Result Interface
 */
export interface JobResult {
    success: boolean;
    message: string;
    data?: any;
    error?: Error;
}

/**
 * Job Options Interface
 */
export interface JobConfig extends JobOptions {
    priority?: JobPriority;
    attempts?: number;
    backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;
    };
    timeout?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
}

/**
 * Queue Configuration
 */
export interface QueueConfig {
    name: string;
    redis: {
        host: string;
        port: number;
        password?: string;
        tls?: boolean;
    };
    prefix?: string;
    defaultJobOptions?: JobConfig;
}

/**
 * Job Processor Function Type
 */
export type JobProcessor<T extends JobData> = (
    job: Job<T>,
    done: (error?: Error | null, result?: JobResult) => void
) => Promise<void>;

/**
 * Job Handler Interface
 */
export interface JobHandler<T extends JobData> {
    process: JobProcessor<T>;
    validate?: (data: T) => Promise<boolean>;
    onFailed?: (job: Job<T>, error: Error) => Promise<void>;
    onCompleted?: (job: Job<T>, result: JobResult) => Promise<void>;
}

/**
 * Queue Service Interface
 */
export interface QueueService {
    addJob<T extends JobData>(
        name: JobName,
        data: Omit<T, keyof BaseJobData>,
        options?: JobConfig
    ): Promise<Job<T>>;
    
    getJob<T extends JobData>(jobId: string): Promise<Job<T> | null>;
    
    removeJob(jobId: string): Promise<void>;
    
    pauseQueue(): Promise<void>;
    
    resumeQueue(): Promise<void>;
    
    getQueueMetrics(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
}
