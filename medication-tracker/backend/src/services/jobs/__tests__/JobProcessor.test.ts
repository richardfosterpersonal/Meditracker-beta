/**
 * Job Processor Tests
 */

import { JobProcessor } from '../JobProcessor';
import { JobName, MedicationReminderData } from '../types';
import { Logger } from '@/core/logging';
import { MetricsCollector } from '@/core/monitoring';
import { NotificationService } from '@/services/notification/NotificationService';
import { MedicationService } from '@/services/medication/MedicationService';
import { Job } from 'bull';

jest.mock('@/core/logging');
jest.mock('@/core/monitoring');
jest.mock('@/services/notification/NotificationService');
jest.mock('@/services/medication/MedicationService');

describe('JobProcessor', () => {
    let jobProcessor: JobProcessor;
    let mockLogger: jest.Mocked<Logger>;
    let mockMetrics: jest.Mocked<MetricsCollector>;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockMedicationService: jest.Mocked<MedicationService>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockMetrics = {
            increment: jest.fn(),
            timing: jest.fn()
        } as any;

        mockNotificationService = {
            sendMedicationReminder: jest.fn(),
            sendAdminAlert: jest.fn()
        } as any;

        mockMedicationService = {
            getMedication: jest.fn()
        } as any;

        jobProcessor = new JobProcessor(
            mockLogger,
            mockMetrics,
            mockNotificationService,
            mockMedicationService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('processJob', () => {
        it('should process a valid medication reminder job', async () => {
            const jobData: MedicationReminderData = {
                jobId: 'job-1',
                priority: 1,
                createdAt: new Date(),
                attempts: 0,
                userId: 'user-1',
                medicationId: 'med-1',
                scheduledTime: new Date(),
                dosage: '10mg'
            };

            const mockJob = {
                id: 'job-1',
                data: jobData
            } as Job<MedicationReminderData>;

            mockMedicationService.getMedication.mockResolvedValue({
                id: 'med-1',
                name: 'Test Medication'
            });

            await jobProcessor.processJob(JobName.MEDICATION_REMINDER, mockJob);

            expect(mockMedicationService.getMedication).toHaveBeenCalledWith('med-1');
            expect(mockNotificationService.sendMedicationReminder).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('job.completed', expect.any(Object));
        });

        it('should handle medication reminder job failure', async () => {
            const jobData: MedicationReminderData = {
                jobId: 'job-1',
                priority: 1,
                createdAt: new Date(),
                attempts: 0,
                userId: 'user-1',
                medicationId: 'med-1',
                scheduledTime: new Date(),
                dosage: '10mg'
            };

            const mockJob = {
                id: 'job-1',
                data: jobData
            } as Job<MedicationReminderData>;

            const error = new Error('Medication not found');
            mockMedicationService.getMedication.mockRejectedValue(error);

            await expect(jobProcessor.processJob(JobName.MEDICATION_REMINDER, mockJob))
                .rejects.toThrow(error);

            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockMetrics.increment).toHaveBeenCalledWith('job.failed', expect.any(Object));
            expect(mockNotificationService.sendAdminAlert).toHaveBeenCalled();
        });

        it('should validate medication reminder data', async () => {
            const invalidJobData: MedicationReminderData = {
                jobId: 'job-1',
                priority: 1,
                createdAt: new Date(),
                attempts: 0,
                userId: '',  // Invalid: empty userId
                medicationId: 'med-1',
                scheduledTime: new Date(),
                dosage: '10mg'
            };

            const mockJob = {
                id: 'job-1',
                data: invalidJobData
            } as Job<MedicationReminderData>;

            await expect(jobProcessor.processJob(JobName.MEDICATION_REMINDER, mockJob))
                .rejects.toThrow('Invalid job data');

            expect(mockMetrics.increment).toHaveBeenCalledWith('job.failed', expect.any(Object));
        });
    });

    describe('job handlers', () => {
        it('should handle unknown job types', async () => {
            const mockJob = {
                id: 'job-1',
                data: {}
            } as Job<any>;

            await expect(jobProcessor.processJob('UNKNOWN_JOB' as JobName, mockJob))
                .rejects.toThrow('No handler found');
        });

        it('should handle refill check jobs', async () => {
            const mockJob = {
                id: 'job-1',
                data: {
                    jobId: 'job-1',
                    priority: 1,
                    createdAt: new Date(),
                    attempts: 0,
                    userId: 'user-1',
                    medicationId: 'med-1',
                    currentSupply: 10,
                    threshold: 5
                }
            } as Job<any>;

            await jobProcessor.processJob(JobName.REFILL_CHECK, mockJob);

            expect(mockMetrics.increment).toHaveBeenCalledWith('job.completed', expect.any(Object));
        });

        it('should handle interaction check jobs', async () => {
            const mockJob = {
                id: 'job-1',
                data: {
                    jobId: 'job-1',
                    priority: 1,
                    createdAt: new Date(),
                    attempts: 0,
                    userId: 'user-1',
                    medications: ['med-1', 'med-2'],
                    checkType: 'new'
                }
            } as Job<any>;

            await jobProcessor.processJob(JobName.INTERACTION_CHECK, mockJob);

            expect(mockMetrics.increment).toHaveBeenCalledWith('job.completed', expect.any(Object));
        });
    });
});
