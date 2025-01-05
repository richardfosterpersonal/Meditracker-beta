/**
 * Queue Service Implementation
 */

import { injectable, inject } from 'inversify';
import Bull, { Queue, Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '@/core/types';
import { Logger } from '@/core/logging';
import { Config } from '@/core/config';
import { MetricsCollector } from '@/core/monitoring';
import {
    QueueService as IQueueService,
    JobName,
    JobData,
    JobConfig,
    JobPriority,
    BaseJobData,
    QueueConfig
} from './types';
import { monitor } from '@/core/monitoring/decorators';

@injectable()
export class QueueService implements IQueueService {
    private queues: Map<JobName, Queue>;
    private readonly defaultConfig: JobConfig = {
        priority: JobPriority.MEDIUM,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        timeout: 5000,
        removeOnComplete: true,
        removeOnFail: false
    };

    constructor(
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.Config) private config: Config,
        @inject(TYPES.MetricsCollector) private metrics: MetricsCollector
    ) {
        this.queues = new Map();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Initialize queues for each job type
            for (const name of Object.values(JobName)) {
                const queue = this.createQueue(name);
                this.queues.set(name, queue);

                // Set up event handlers
                this.setupQueueEvents(queue, name);
            }

            this.logger.info('Queue service initialized');
        } catch (error) {
            this.logger.error('Failed to initialize queue service', { error });
            throw error;
        }
    }

    private createQueue(name: JobName): Queue {
        const queueConfig: QueueConfig = {
            name,
            redis: this.config.redis,
            prefix: 'medication-tracker',
            defaultJobOptions: this.defaultConfig
        };

        return new Bull(name, {
            redis: queueConfig.redis,
            prefix: queueConfig.prefix,
            defaultJobOptions: queueConfig.defaultJobOptions
        });
    }

    private setupQueueEvents(queue: Queue, name: JobName): void {
        queue.on('error', (error) => {
            this.logger.error(`Queue ${name} error`, { error });
            this.metrics.increment('queue.error', { queue: name });
        });

        queue.on('waiting', (jobId) => {
            this.metrics.increment('queue.waiting', { queue: name });
        });

        queue.on('active', (job) => {
            this.metrics.increment('queue.active', { queue: name });
        });

        queue.on('completed', (job, result) => {
            this.metrics.increment('queue.completed', { queue: name });
        });

        queue.on('failed', (job, error) => {
            this.metrics.increment('queue.failed', { queue: name });
            this.logger.error(`Job ${job.id} failed`, { error, queue: name });
        });

        queue.on('stalled', (job) => {
            this.metrics.increment('queue.stalled', { queue: name });
            this.logger.warn(`Job ${job.id} stalled`, { queue: name });
        });
    }

    @monitor('queue.add_job')
    public async addJob<T extends JobData>(
        name: JobName,
        data: Omit<T, keyof BaseJobData>,
        options: JobConfig = {}
    ): Promise<Job<T>> {
        const queue = this.queues.get(name);
        if (!queue) {
            throw new Error(`Queue ${name} not found`);
        }

        const jobData: T = {
            ...data as any,
            jobId: uuidv4(),
            priority: options.priority || this.defaultConfig.priority,
            createdAt: new Date(),
            attempts: 0
        } as T;

        const jobOptions: JobConfig = {
            ...this.defaultConfig,
            ...options
        };

        try {
            const job = await queue.add(jobData, jobOptions);
            this.logger.info(`Added job ${job.id} to queue ${name}`);
            this.metrics.increment('queue.job_added', { queue: name });
            return job;
        } catch (error) {
            this.logger.error(`Failed to add job to queue ${name}`, { error });
            this.metrics.increment('queue.job_add_failed', { queue: name });
            throw error;
        }
    }

    @monitor('queue.get_job')
    public async getJob<T extends JobData>(jobId: string): Promise<Job<T> | null> {
        for (const [name, queue] of this.queues) {
            try {
                const job = await queue.getJob(jobId);
                if (job) {
                    return job as Job<T>;
                }
            } catch (error) {
                this.logger.error(`Failed to get job ${jobId} from queue ${name}`, { error });
            }
        }
        return null;
    }

    @monitor('queue.remove_job')
    public async removeJob(jobId: string): Promise<void> {
        for (const [name, queue] of this.queues) {
            try {
                const job = await queue.getJob(jobId);
                if (job) {
                    await job.remove();
                    this.logger.info(`Removed job ${jobId} from queue ${name}`);
                    this.metrics.increment('queue.job_removed', { queue: name });
                    return;
                }
            } catch (error) {
                this.logger.error(`Failed to remove job ${jobId} from queue ${name}`, { error });
            }
        }
    }

    @monitor('queue.pause')
    public async pauseQueue(): Promise<void> {
        for (const [name, queue] of this.queues) {
            try {
                await queue.pause();
                this.logger.info(`Paused queue ${name}`);
                this.metrics.increment('queue.paused', { queue: name });
            } catch (error) {
                this.logger.error(`Failed to pause queue ${name}`, { error });
            }
        }
    }

    @monitor('queue.resume')
    public async resumeQueue(): Promise<void> {
        for (const [name, queue] of this.queues) {
            try {
                await queue.resume();
                this.logger.info(`Resumed queue ${name}`);
                this.metrics.increment('queue.resumed', { queue: name });
            } catch (error) {
                this.logger.error(`Failed to resume queue ${name}`, { error });
            }
        }
    }

    @monitor('queue.metrics')
    public async getQueueMetrics(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        const metrics = {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0
        };

        for (const [name, queue] of this.queues) {
            try {
                const counts = await queue.getJobCounts();
                metrics.waiting += counts.waiting;
                metrics.active += counts.active;
                metrics.completed += counts.completed;
                metrics.failed += counts.failed;
                metrics.delayed += counts.delayed;
            } catch (error) {
                this.logger.error(`Failed to get metrics for queue ${name}`, { error });
            }
        }

        return metrics;
    }
}
