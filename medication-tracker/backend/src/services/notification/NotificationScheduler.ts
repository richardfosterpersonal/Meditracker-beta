/**
 * Notification Scheduler Implementation
 */

import { injectable, inject } from 'inversify';
import { Logger } from '@/core/logging';
import { TYPES } from '@/core/types';
import { NotificationService } from './NotificationService';
import { MedicationRepository } from '@/domain/medication/MedicationRepository';
import { UserRepository } from '@/domain/user/UserRepository';
import { monitor } from '@/core/monitoring';
import { Medication } from '@/domain/medication/types';
import { UserPreferences } from '@/domain/user/types';
import { addDays, addMinutes, isBefore } from 'date-fns';
import { Config } from '@/core/config';

@injectable()
export class NotificationScheduler {
    constructor(
        @inject(TYPES.NotificationService) private notificationService: NotificationService,
        @inject(TYPES.MedicationRepository) private medicationRepository: MedicationRepository,
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.Config) private config: Config
    ) {}

    @monitor('scheduler.schedule')
    async scheduleNotifications(): Promise<void> {
        try {
            const medications = await this.medicationRepository.findActive();
            
            for (const medication of medications) {
                const preferences = await this.userRepository.getPreferences(medication.userId);
                if (!preferences) continue;

                await this.scheduleDoseNotifications(medication, preferences);
                await this.scheduleRefillReminder(medication, preferences);
                await this.checkInteractions(medication, preferences);
            }
        } catch (error) {
            this.logger.error('Error scheduling notifications', { error });
            throw error;
        }
    }

    @monitor('scheduler.dose')
    private async scheduleDoseNotifications(
        medication: Medication,
        preferences: UserPreferences
    ): Promise<void> {
        const now = new Date();
        const scheduleUntil = addDays(now, 7); // Schedule a week ahead

        try {
            for (const schedule of medication.schedule) {
                let nextDose = schedule.getNextDose(now);
                
                while (isBefore(nextDose, scheduleUntil)) {
                    // Schedule reminder before dose time
                    const reminderTime = addMinutes(
                        nextDose,
                        -preferences.advanceNotice
                    );

                    if (isBefore(now, reminderTime)) {
                        await this.notificationService.createNotification(
                            medication.userId,
                            'medication_reminder',
                            `Time to take ${medication.name}`,
                            {
                                medicationId: medication.id,
                                dosage: schedule.dosage,
                                scheduledTime: nextDose
                            },
                            reminderTime
                        );
                    }

                    // Schedule missed dose check
                    const missedCheckTime = addMinutes(
                        nextDose,
                        this.config.medication.missedDoseThreshold
                    );

                    await this.notificationService.createNotification(
                        medication.userId,
                        'missed_medication',
                        `Did you take your ${medication.name}?`,
                        {
                            medicationId: medication.id,
                            dosage: schedule.dosage,
                            scheduledTime: nextDose
                        },
                        missedCheckTime
                    );

                    nextDose = schedule.getNextDose(nextDose);
                }
            }
        } catch (error) {
            this.logger.error('Error scheduling dose notifications', {
                error,
                medicationId: medication.id,
                userId: medication.userId
            });
        }
    }

    @monitor('scheduler.refill')
    private async scheduleRefillReminder(
        medication: Medication,
        preferences: UserPreferences
    ): Promise<void> {
        try {
            if (!medication.currentSupply || !medication.refillThreshold) return;

            const daysUntilRefill = medication.calculateDaysUntilRefill();
            if (daysUntilRefill <= medication.refillThreshold) {
                await this.notificationService.createNotification(
                    medication.userId,
                    'refill_reminder',
                    `Time to refill ${medication.name}`,
                    {
                        medicationId: medication.id,
                        currentSupply: medication.currentSupply,
                        daysRemaining: daysUntilRefill
                    }
                );
            }
        } catch (error) {
            this.logger.error('Error scheduling refill reminder', {
                error,
                medicationId: medication.id,
                userId: medication.userId
            });
        }
    }

    @monitor('scheduler.interactions')
    private async checkInteractions(
        medication: Medication,
        preferences: UserPreferences
    ): Promise<void> {
        try {
            const userMedications = await this.medicationRepository.findByUserId(
                medication.userId
            );

            const interactions = await medication.checkInteractions(userMedications);
            
            for (const interaction of interactions) {
                await this.notificationService.createNotification(
                    medication.userId,
                    'interaction_alert',
                    `Potential interaction between ${medication.name} and ${interaction.medication.name}`,
                    {
                        medicationId: medication.id,
                        interactionWith: interaction.medication.id,
                        severity: interaction.severity,
                        description: interaction.description
                    }
                );
            }
        } catch (error) {
            this.logger.error('Error checking interactions', {
                error,
                medicationId: medication.id,
                userId: medication.userId
            });
        }
    }
}
