/**
 * Notification Service Implementation
 */

import { injectable, inject } from 'inversify';
import { Logger } from '@/core/logging';
import { TYPES } from '@/core/types';
import {
    Notification,
    NotificationConfig,
    NotificationRepository,
    EmailSender,
    PushSender,
    NotificationMetrics,
    RateLimiter,
    PermissionService,
    EncryptionService,
    SignatureService
} from './types';
import { UserPreferences } from '@/domain/user/types';
import { UserRepository } from '@/domain/user/UserRepository';
import { CarerRepository } from '@/domain/carer/CarerRepository';
import { monitor } from '@/core/monitoring';

@injectable()
export class NotificationService {
    private readonly config: NotificationConfig = {
        types: {
            medication_reminder: {
                title: 'Medication Reminder',
                priority: 'high',
                notifyCarers: true
            },
            refill_reminder: {
                title: 'Refill Reminder',
                priority: 'medium',
                notifyCarers: true
            },
            interaction_alert: {
                title: 'Interaction Alert',
                priority: 'high',
                notifyCarers: true
            },
            natural_alternative: {
                title: 'Natural Alternative Available',
                priority: 'low',
                notifyCarers: false
            },
            missed_medication: {
                title: 'Missed Medication Alert',
                priority: 'high',
                notifyCarers: true
            }
        }
    };

    constructor(
        @inject(TYPES.NotificationRepository) private repository: NotificationRepository,
        @inject(TYPES.EmailSender) private emailSender: EmailSender,
        @inject(TYPES.PushSender) private pushSender: PushSender,
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.CarerRepository) private carerRepository: CarerRepository,
        @inject(TYPES.NotificationMetrics) private metrics: NotificationMetrics,
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.RateLimiter) private rateLimiter: RateLimiter,
        @inject(TYPES.PermissionService) private permissionService: PermissionService,
        @inject(TYPES.EncryptionService) private encryptionService: EncryptionService,
        @inject(TYPES.SignatureService) private signatureService: SignatureService,
    ) {}

    @monitor('notification.create')
    async createNotification(
        userId: number,
        type: string,
        message: string,
        metadata?: Record<string, any>,
        scheduleTime?: Date
    ): Promise<Notification> {
        const config = this.config.types[type];
        if (!config) {
            throw new Error(`Invalid notification type: ${type}`);
        }

        const notification: Notification = {
            userId,
            type,
            status: 'scheduled',
            priority: config.priority,
            data: {
                message,
                ...metadata
            },
            createdAt: new Date(),
            scheduledTime: scheduleTime || new Date()
        };

        try {
            const saved = await this.repository.save(notification);
            
            if (config.notifyCarers) {
                await this.notifyCarers(userId, type, message, metadata);
            }

            return saved;
        } catch (error) {
            this.logger.error('Failed to create notification', { error, userId, type });
            this.metrics.incrementFailed(type);
            throw error;
        }
    }

    @monitor('notification.send')
    async sendNotification(notification: Notification): Promise<void> {
        const start = Date.now();

        try {
            // Rate limiting check
            const rateLimitKey = `notification:${notification.userId}`;
            const isRateLimited = await this.rateLimiter.checkLimit(rateLimitKey, {
                points: 1,
                duration: 60,
                blockDuration: 300
            });

            if (isRateLimited) {
                this.logger.warn('Rate limit exceeded for notifications', {
                    userId: notification.userId,
                    type: notification.type
                });
                return;
            }

            // Permission verification
            const hasPermission = await this.permissionService.checkPermission(
                notification.userId,
                'notifications.send',
                notification.type
            );

            if (!hasPermission) {
                this.logger.warn('User lacks permission for notification', {
                    userId: notification.userId,
                    type: notification.type
                });
                return;
            }

            const user = await this.userRepository.findById(notification.userId);
            if (!user) {
                throw new Error(`User not found: ${notification.userId}`);
            }

            const preferences = await this.userRepository.getPreferences(notification.userId);
            if (!this.shouldSendNotification(notification.type, preferences)) {
                this.logger.info('Notification skipped based on preferences', { 
                    userId: notification.userId,
                    type: notification.type 
                });
                return;
            }

            if (preferences.emailEnabled) {
                const encryptedContent = await this.encryptNotification(notification);
                const signature = await this.signNotification(notification, encryptedContent);

                await this.emailSender.sendEmail({
                    to: user.email,
                    subject: this.config.types[notification.type].title,
                    html: this.formatEmailContent(notification),
                    notificationId: notification.id,
                    encryptedContent,
                    signature
                });
            }

            if (preferences.pushEnabled && user.pushSubscription) {
                const encryptedContent = await this.encryptNotification(notification);
                const signature = await this.signNotification(notification, encryptedContent);

                await this.pushSender.sendPush(
                    user.pushSubscription,
                    this.config.types[notification.type].title,
                    notification.data?.message || '',
                    {
                        notificationId: notification.id,
                        encryptedContent,
                        signature
                    }
                );
            }

            notification.status = 'sent';
            notification.sentAt = new Date();
            await this.repository.save(notification);

            this.metrics.incrementSent(notification.type);
            this.metrics.observeLatency(notification.type, Date.now() - start);
        } catch (error) {
            this.logger.error('Failed to send notification', { 
                error,
                notificationId: notification.id,
                userId: notification.userId 
            });
            
            notification.status = 'failed';
            notification.errorMessage = error.message;
            await this.repository.save(notification);
            
            this.metrics.incrementFailed(notification.type);
            throw error;
        }
    }

    private async notifyCarers(
        userId: number,
        type: string,
        message: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const carers = await this.carerRepository.getForPatient(userId);
        
        for (const carer of carers) {
            if (carer.notificationPermissions?.[type]) {
                await this.createNotification(
                    carer.id,
                    type,
                    message,
                    {
                        ...metadata,
                        patientId: userId,
                        isCarerNotification: true
                    }
                );
            }
        }
    }

    private shouldSendNotification(type: string, preferences: UserPreferences): boolean {
        // Add custom logic based on notification type and user preferences
        return true;
    }

    private formatEmailContent(notification: Notification): string {
        // Add email template formatting logic
        return `
            <h1>${this.config.types[notification.type].title}</h1>
            <p>${notification.data?.message || ''}</p>
        `;
    }

    private async encryptNotification(notification: Notification): Promise<string> {
        const payload = {
            id: notification.id,
            type: notification.type,
            title: this.config.types[notification.type].title,
            message: notification.data?.message || '',
            timestamp: new Date().toISOString()
        };
        
        return this.encryptionService.encrypt(JSON.stringify(payload));
    }

    private async signNotification(notification: Notification, encryptedContent: string): Promise<string> {
        const signaturePayload = {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            content: encryptedContent,
            timestamp: new Date().toISOString()
        };

        return this.signatureService.sign(JSON.stringify(signaturePayload));
    }
}
