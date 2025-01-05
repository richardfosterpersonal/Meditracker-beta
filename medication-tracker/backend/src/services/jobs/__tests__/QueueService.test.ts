/**
 * Queue Service Tests
 */

import { QueueService } from '../QueueService';
import { JobName, JobPriority } from '../types';
import { Logger } from '@/core/logging';
import { Config } from '@/core/config';
import { MetricsCollector } from '@/core/monitoring';
import Bull from 'bull';

jest.mock('bull');
jest.mock('@/core/logging');
jest.mock('@/core/config');
jest.mock('@/core/monitoring');

describe('QueueService', () => {
    let queueService: QueueService;
    let mockLogger: jest.Mocked<Logger>;
    let mockConfig: jest.Mocked<Config>;
    let mockMetrics: jest.Mocked<MetricsCollector>;
    let mockQueue: jest.Mocked<Bull.Queue>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockConfig = {
            redis: {
                host: 'localhost',
                port: 6379
            }
        } as any;

        mockMetrics = {
            increment: jest.fn(),
            timing: jest.fn()
        } as any;

        mockQueue = {
            add: jest.fn(),
            getJob: jest.fn(),
            remove: jest.fn(),
            pause: jest.fn(),
            resume: jest.fn(),
            getJobCounts: jest.fn(),
            on: jest.fn()
        } as any;

        (Bull as jest.Mock).mockImplementation(() => mockQueue);

        queueService = new QueueService(mockLogger, mockConfig, mockMetrics);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addJob', () => {
        it('should add a job to the queue', async () => {
            const jobData = {
                userId: '123',
                medicationId: '456',
                scheduledTime: new Date(),
                dosage: '10mg'
            };

            const mockJob = { id: 'job-1' };
            mockQueue.add.mockResolvedValue(mockJob);

            const result = await queueService.addJob(JobName.MEDICATION_REMINDER, jobData);

            expect(result).toBe(mockJob);
            expect(mockQueue.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...jobData,
                    jobId: expect.any(String),
                    priority: JobPriority.MEDIUM,
                    createdAt: expect.any(Date),
                    attempts: 0
                }),
                expect.any(Object)
            );
            expect(mockLogger.info).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('queue.job_added', expect.any(Object));
        });

        it('should handle errors when adding a job', async () => {
            const error = new Error('Queue error');
            mockQueue.add.mockRejectedValue(error);

            await expect(queueService.addJob(JobName.MEDICATION_REMINDER, {})).rejects.toThrow(error);
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('queue.job_add_failed', expect.any(Object));
        });
    });

    describe('getJob', () => {
        it('should retrieve a job by id', async () => {
            const mockJob = { id: 'job-1' };
            mockQueue.getJob.mockResolvedValue(mockJob);

            const result = await queueService.getJob('job-1');

            expect(result).toBe(mockJob);
            expect(mockQueue.getJob).toHaveBeenCalledWith('job-1');
        });

        it('should return null if job not found', async () => {
            mockQueue.getJob.mockResolvedValue(null);

            const result = await queueService.getJob('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('removeJob', () => {
        it('should remove a job from the queue', async () => {
            const mockJob = { id: 'job-1', remove: jest.fn() };
            mockQueue.getJob.mockResolvedValue(mockJob);

            await queueService.removeJob('job-1');

            expect(mockJob.remove).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('queue.job_removed', expect.any(Object));
        });
    });

    describe('pauseQueue', () => {
        it('should pause all queues', async () => {
            await queueService.pauseQueue();

            expect(mockQueue.pause).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('queue.paused', expect.any(Object));
        });
    });

    describe('resumeQueue', () => {
        it('should resume all queues', async () => {
            await queueService.resumeQueue();

            expect(mockQueue.resume).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('queue.resumed', expect.any(Object));
        });
    });

    describe('getQueueMetrics', () => {
        it('should return aggregated queue metrics', async () => {
            const mockCounts = {
                waiting: 1,
                active: 2,
                completed: 3,
                failed: 4,
                delayed: 5
            };
            mockQueue.getJobCounts.mockResolvedValue(mockCounts);

            const result = await queueService.getQueueMetrics();

            expect(result).toEqual(mockCounts);
            expect(mockQueue.getJobCounts).toHaveBeenCalled();
        });

        it('should handle errors when getting metrics', async () => {
            const error = new Error('Metrics error');
            mockQueue.getJobCounts.mockRejectedValue(error);

            const result = await queueService.getQueueMetrics();

            expect(result).toEqual({
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
