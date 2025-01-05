/**
 * Background Jobs Integration Tests
 */

import { Container } from 'inversify';
import { QueueService } from '../../QueueService';
import { JobProcessor } from '../../JobProcessor';
import { NotificationService } from '@/services/notification/NotificationService';
import { MedicationService } from '@/services/medication/MedicationService';
import { Logger } from '@/core/logging';
import { MetricsCollector } from '@/core/monitoring';
import { Config } from '@/core/config';
import { TYPES } from '@/core/types';
import {
    JobName,
    JobPriority,
    MedicationReminderData,
    RefillCheckData,
    InteractionCheckData
} from '../../types';

describe('Background Jobs Integration', () => {
    let container: Container;
    let queueService: QueueService;
    let jobProcessor: JobProcessor;
    let notificationService: NotificationService;
    let medicationService: MedicationService;

    beforeAll(async () => {
        // Set up test container
        container = new Container();
        container.bind<Logger>(TYPES.Logger).to(Logger);
        container.bind<Config>(TYPES.Config).to(Config);
        container.bind<MetricsCollector>(TYPES.MetricsCollector).to(MetricsCollector);
        container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService);
        container.bind<MedicationService>(TYPES.MedicationService).to(MedicationService);
        container.bind<QueueService>(TYPES.QueueService).to(QueueService);
        container.bind<JobProcessor>(TYPES.JobProcessor).to(JobProcessor);

        // Initialize services
        queueService = container.get<QueueService>(TYPES.QueueService);
        jobProcessor = container.get<JobProcessor>(TYPES.JobProcessor);
        notificationService = container.get<NotificationService>(TYPES.NotificationService);
        medicationService = container.get<MedicationService>(TYPES.MedicationService);

        // Wait for queue connection
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        // Clean up queues
        await queueService.pauseQueue();
        // Additional cleanup as needed
    });

    describe('Medication Reminder Flow', () => {
        it('should process medication reminder end-to-end', async () => {
            // Setup test data
            const medicationData = {
                id: 'test-med-1',
                name: 'Test Medication',
                dosage: '10mg',
                frequency: 'daily'
            };

            const reminderData: Omit<MedicationReminderData, 'jobId' | 'createdAt' | 'attempts'> = {
                userId: 'test-user-1',
                medicationId: medicationData.id,
                scheduledTime: new Date(),
                dosage: medicationData.dosage,
                priority: JobPriority.HIGH
            };

            // Mock medication service
            jest.spyOn(medicationService, 'getMedication')
                .mockResolvedValue(medicationData);

            // Mock notification service
            const notifySpy = jest.spyOn(notificationService, 'sendMedicationReminder')
                .mockResolvedValue(undefined);

            // Add job to queue
            const job = await queueService.addJob(
                JobName.MEDICATION_REMINDER,
                reminderData
            );

            // Process the job
            await jobProcessor.processJob(JobName.MEDICATION_REMINDER, job);

            // Verify notifications sent
            expect(notifySpy).toHaveBeenCalledWith({
                userId: reminderData.userId,
                medicationName: medicationData.name,
                dosage: reminderData.dosage,
                scheduledTime: reminderData.scheduledTime
            });
        });

        it('should handle medication reminder failure gracefully', async () => {
            const reminderData: Omit<MedicationReminderData, 'jobId' | 'createdAt' | 'attempts'> = {
                userId: 'test-user-2',
                medicationId: 'non-existent',
                scheduledTime: new Date(),
                dosage: '20mg',
                priority: JobPriority.HIGH
            };

            // Mock medication service to simulate failure
            jest.spyOn(medicationService, 'getMedication')
                .mockRejectedValue(new Error('Medication not found'));

            // Mock admin notification
            const adminNotifySpy = jest.spyOn(notificationService, 'sendAdminAlert')
                .mockResolvedValue(undefined);

            // Add and process job
            const job = await queueService.addJob(
                JobName.MEDICATION_REMINDER,
                reminderData
            );

            await expect(jobProcessor.processJob(JobName.MEDICATION_REMINDER, job))
                .rejects.toThrow('Medication not found');

            // Verify admin notification sent
            expect(adminNotifySpy).toHaveBeenCalled();
        });
    });

    describe('Refill Check Flow', () => {
        it('should process refill check end-to-end', async () => {
            const medicationData = {
                id: 'test-med-2',
                name: 'Test Medication 2',
                dosage: '5mg',
                frequency: 'daily'
            };

            const refillData: Omit<RefillCheckData, 'jobId' | 'createdAt' | 'attempts'> = {
                userId: 'test-user-3',
                medicationId: medicationData.id,
                currentSupply: 5,
                threshold: 7,
                priority: JobPriority.MEDIUM
            };

            // Mock medication service
            jest.spyOn(medicationService, 'getMedication')
                .mockResolvedValue(medicationData);

            // Mock notification service
            const notifySpy = jest.spyOn(notificationService, 'sendRefillReminder')
                .mockResolvedValue(undefined);

            // Add and process job
            const job = await queueService.addJob(
                JobName.REFILL_CHECK,
                refillData
            );

            await jobProcessor.processJob(JobName.REFILL_CHECK, job);

            // Verify refill reminder sent
            expect(notifySpy).toHaveBeenCalledWith({
                userId: refillData.userId,
                medicationName: medicationData.name,
                currentSupply: refillData.currentSupply,
                threshold: refillData.threshold
            });
        });
    });

    describe('Interaction Check Flow', () => {
        it('should process interaction check end-to-end', async () => {
            const medications = [
                { id: 'med-1', name: 'Med 1' },
                { id: 'med-2', name: 'Med 2' }
            ];

            const interactionData: Omit<InteractionCheckData, 'jobId' | 'createdAt' | 'attempts'> = {
                userId: 'test-user-4',
                medications: medications.map(m => m.id),
                checkType: 'new',
                priority: JobPriority.HIGH
            };

            // Mock medication service
            jest.spyOn(medicationService, 'getMedication')
                .mockImplementation(async (id) => 
                    medications.find(m => m.id === id) || null
                );

            // Mock interaction check
            const interactions = [
                { med1: 'med-1', med2: 'med-2', severity: 'moderate' }
            ];
            jest.spyOn(medicationService, 'checkInteractions')
                .mockResolvedValue(interactions);

            // Mock notification service
            const notifySpy = jest.spyOn(notificationService, 'sendInteractionWarning')
                .mockResolvedValue(undefined);

            // Add and process job
            const job = await queueService.addJob(
                JobName.INTERACTION_CHECK,
                interactionData
            );

            await jobProcessor.processJob(JobName.INTERACTION_CHECK, job);

            // Verify interaction warning sent
            expect(notifySpy).toHaveBeenCalledWith({
                userId: interactionData.userId,
                interactions,
                checkType: interactionData.checkType
            });
        });
    });

    describe('Queue Management', () => {
        it('should handle queue pause and resume', async () => {
            // Pause queues
            await queueService.pauseQueue();
            const metricsPaused = await queueService.getQueueMetrics();
            expect(metricsPaused.active).toBe(0);

            // Resume queues
            await queueService.resumeQueue();
            const metricsResumed = await queueService.getQueueMetrics();
            expect(metricsResumed.active).toBe(0);
        });

        it('should track queue metrics', async () => {
            const metrics = await queueService.getQueueMetrics();
            expect(metrics).toHaveProperty('waiting');
            expect(metrics).toHaveProperty('active');
            expect(metrics).toHaveProperty('completed');
            expect(metrics).toHaveProperty('failed');
            expect(metrics).toHaveProperty('delayed');
        });
    });
});
