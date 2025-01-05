/**
 * Job Processor Implementation
 */

import { injectable, inject } from 'inversify';
import { Job } from 'bull';
import { TYPES } from '@/core/types';
import { Logger } from '@/core/logging';
import { MetricsCollector } from '@/core/monitoring';
import { NotificationService } from '@/services/notification/NotificationService';
import { MedicationService } from '@/services/medication/MedicationService';
import {
    JobName,
    JobData,
    JobHandler,
    JobResult,
    MedicationReminderData,
    RefillCheckData,
    InteractionCheckData,
    NotificationCleanupData,
    MetricsRollupData,
    ErrorCleanupData
} from './types';
import { monitor } from '@/core/monitoring/decorators';

@injectable()
export class JobProcessor {
    private handlers: Map<JobName, JobHandler<any>>;

    constructor(
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.MetricsCollector) private metrics: MetricsCollector,
        @inject(TYPES.NotificationService) private notificationService: NotificationService,
        @inject(TYPES.MedicationService) private medicationService: MedicationService
    ) {
        this.handlers = new Map();
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        // Medication Reminder Handler
        this.handlers.set(JobName.MEDICATION_REMINDER, {
            process: this.processMedicationReminder.bind(this),
            validate: this.validateMedicationReminder.bind(this),
            onFailed: this.handleMedicationReminderFailure.bind(this)
        });

        // Refill Check Handler
        this.handlers.set(JobName.REFILL_CHECK, {
            process: this.processRefillCheck.bind(this),
            validate: this.validateRefillCheck.bind(this)
        });

        // Interaction Check Handler
        this.handlers.set(JobName.INTERACTION_CHECK, {
            process: this.processInteractionCheck.bind(this),
            validate: this.validateInteractionCheck.bind(this)
        });

        // Notification Cleanup Handler
        this.handlers.set(JobName.NOTIFICATION_CLEANUP, {
            process: this.processNotificationCleanup.bind(this)
        });

        // Metrics Rollup Handler
        this.handlers.set(JobName.METRICS_ROLLUP, {
            process: this.processMetricsRollup.bind(this)
        });

        // Error Cleanup Handler
        this.handlers.set(JobName.ERROR_CLEANUP, {
            process: this.processErrorCleanup.bind(this)
        });
    }

    @monitor('job.process')
    public async processJob<T extends JobData>(
        jobName: JobName,
        job: Job<T>
    ): Promise<void> {
        const handler = this.handlers.get(jobName);
        if (!handler) {
            throw new Error(`No handler found for job type ${jobName}`);
        }

        try {
            // Validate job data if validator exists
            if (handler.validate) {
                const isValid = await handler.validate(job.data);
                if (!isValid) {
                    throw new Error(`Invalid job data for ${jobName}`);
                }
            }

            // Process the job
            await handler.process(job, async (error, result) => {
                if (error) {
                    this.metrics.increment('job.failed', { type: jobName });
                    if (handler.onFailed) {
                        await handler.onFailed(job, error);
                    }
                    throw error;
                }

                this.metrics.increment('job.completed', { type: jobName });
                if (handler.onCompleted && result) {
                    await handler.onCompleted(job, result);
                }
            });
        } catch (error) {
            this.logger.error(`Failed to process job ${job.id}`, { error });
            throw error;
        }
    }

    @monitor('job.medication_reminder')
    private async processMedicationReminder(
        job: Job<MedicationReminderData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { userId, medicationId, scheduledTime, dosage, instructions } = job.data;

            // Get medication details
            const medication = await this.medicationService.getMedication(medicationId);
            if (!medication) {
                throw new Error(`Medication ${medicationId} not found`);
            }

            // Send notification
            await this.notificationService.sendMedicationReminder({
                userId,
                medicationName: medication.name,
                dosage,
                scheduledTime,
                instructions
            });

            done(null, {
                success: true,
                message: 'Medication reminder sent successfully'
            });
        } catch (error) {
            done(error as Error);
        }
    }

    private async validateMedicationReminder(
        data: MedicationReminderData
    ): Promise<boolean> {
        return !!(
            data.userId &&
            data.medicationId &&
            data.scheduledTime &&
            data.dosage
        );
    }

    private async handleMedicationReminderFailure(
        job: Job<MedicationReminderData>,
        error: Error
    ): Promise<void> {
        this.logger.error(`Medication reminder failed`, {
            jobId: job.id,
            userId: job.data.userId,
            medicationId: job.data.medicationId,
            error
        });

        // Send failure notification to admin
        await this.notificationService.sendAdminAlert({
            type: 'job_failure',
            jobType: JobName.MEDICATION_REMINDER,
            jobId: job.id,
            error: error.message
        });
    }

    @monitor('job.refill_check')
    private async processRefillCheck(
        job: Job<RefillCheckData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { userId, medicationId, currentSupply, threshold } = job.data;

            // Get medication details
            const medication = await this.medicationService.getMedication(medicationId);
            if (!medication) {
                throw new Error(`Medication ${medicationId} not found`);
            }

            // Check if refill needed
            if (currentSupply <= threshold) {
                // Send refill notification
                await this.notificationService.sendRefillReminder({
                    userId,
                    medicationName: medication.name,
                    currentSupply,
                    threshold
                });

                done(null, {
                    success: true,
                    message: 'Refill reminder sent',
                    data: { needsRefill: true }
                });
            } else {
                done(null, {
                    success: true,
                    message: 'No refill needed',
                    data: { needsRefill: false }
                });
            }
        } catch (error) {
            done(error as Error);
        }
    }

    private async validateRefillCheck(data: RefillCheckData): Promise<boolean> {
        return !!(
            data.userId &&
            data.medicationId &&
            typeof data.currentSupply === 'number' &&
            typeof data.threshold === 'number'
        );
    }

    @monitor('job.interaction_check')
    private async processInteractionCheck(
        job: Job<InteractionCheckData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { userId, medications, checkType } = job.data;

            // Get all medication details
            const medicationDetails = await Promise.all(
                medications.map(id => this.medicationService.getMedication(id))
            );

            // Filter out any null results
            const validMedications = medicationDetails.filter(med => med !== null);

            if (validMedications.length !== medications.length) {
                throw new Error('Some medications not found');
            }

            // Check for interactions
            const interactions = await this.medicationService.checkInteractions(validMedications);

            if (interactions.length > 0) {
                // Send interaction warning
                await this.notificationService.sendInteractionWarning({
                    userId,
                    interactions,
                    checkType
                });

                done(null, {
                    success: true,
                    message: 'Interactions found and notification sent',
                    data: { interactions }
                });
            } else {
                done(null, {
                    success: true,
                    message: 'No interactions found',
                    data: { interactions: [] }
                });
            }
        } catch (error) {
            done(error as Error);
        }
    }

    private async validateInteractionCheck(
        data: InteractionCheckData
    ): Promise<boolean> {
        return !!(
            data.userId &&
            Array.isArray(data.medications) &&
            data.medications.length > 0
        );
    }

    @monitor('job.notification_cleanup')
    private async processNotificationCleanup(
        job: Job<NotificationCleanupData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { olderThan, types, excludeIds } = job.data;

            // Delete old notifications
            const result = await this.notificationService.deleteNotifications({
                olderThan,
                types,
                excludeIds
            });

            done(null, {
                success: true,
                message: 'Notifications cleaned up',
                data: { deletedCount: result.count }
            });
        } catch (error) {
            done(error as Error);
        }
    }

    @monitor('job.metrics_rollup')
    private async processMetricsRollup(
        job: Job<MetricsRollupData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { metricTypes, startTime, endTime, resolution } = job.data;

            // Process metrics for each type
            const results = await Promise.all(
                metricTypes.map(async type => {
                    const metrics = await this.metrics.getRollup(type, {
                        startTime,
                        endTime,
                        resolution
                    });

                    return {
                        type,
                        metrics
                    };
                })
            );

            done(null, {
                success: true,
                message: 'Metrics rollup completed',
                data: { results }
            });
        } catch (error) {
            done(error as Error);
        }
    }

    @monitor('job.error_cleanup')
    private async processErrorCleanup(
        job: Job<ErrorCleanupData>,
        done: (error?: Error | null, result?: JobResult) => void
    ): Promise<void> {
        try {
            const { olderThan, errorTypes, excludeIds } = job.data;

            // Clean up old error logs
            const result = await this.logger.cleanupErrors({
                olderThan,
                types: errorTypes,
                excludeIds
            });

            done(null, {
                success: true,
                message: 'Error logs cleaned up',
                data: { deletedCount: result.count }
            });
        } catch (error) {
            done(error as Error);
        }
    }
}
