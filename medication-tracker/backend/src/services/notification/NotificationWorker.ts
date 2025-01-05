/**
 * Notification Worker Implementation
 */

import { injectable, inject } from 'inversify';
import { Logger } from '@/core/logging';
import { TYPES } from '@/core/types';
import { NotificationService } from './NotificationService';
import { NotificationRepository } from './types';
import { monitor } from '@/core/monitoring';
import { Worker } from '@/infrastructure/queue/Worker';
import { Config } from '@/core/config';

@injectable()
export class NotificationWorker extends Worker {
    constructor(
        @inject(TYPES.NotificationService) private notificationService: NotificationService,
        @inject(TYPES.NotificationRepository) private repository: NotificationRepository,
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.Config) private config: Config
    ) {
        super('notification-worker');
    }

    @monitor('worker.process')
    protected async process(): Promise<void> {
        try {
            const now = new Date();
            const notifications = await this.repository.getForProcessing(now);

            for (const notification of notifications) {
                try {
                    await this.notificationService.sendNotification(notification);
                } catch (error) {
                    this.logger.error('Failed to process notification', {
                        error,
                        notificationId: notification.id
                    });

                    // Retry logic
                    if (this.shouldRetry(notification)) {
                        notification.status = 'scheduled';
                        notification.scheduledTime = new Date(
                            Date.now() + this.config.notification.retryDelay
                        );
                        await this.repository.save(notification);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error in notification worker', { error });
        }
    }

    private shouldRetry(notification: { retryCount?: number }): boolean {
        const maxRetries = this.config.notification.maxRetries || 3;
        return (notification.retryCount || 0) < maxRetries;
    }

    public static async create(container: Container): Promise<NotificationWorker> {
        const worker = container.get<NotificationWorker>(TYPES.NotificationWorker);
        await worker.start();
        return worker;
    }
}
