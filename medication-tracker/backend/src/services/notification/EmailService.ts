/**
 * Email Service Implementation
 */

import { injectable, inject } from 'inversify';
import { Logger } from '@/core/logging';
import { TYPES } from '@/core/types';
import { EmailData, EmailSender, NotificationMetrics } from './types';
import { monitor } from '@/core/monitoring';
import { Queue } from '@/infrastructure/queue';
import { Config } from '@/core/config';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@injectable()
export class EmailService implements EmailSender {
    private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
    private readonly emailQueue: Queue<EmailData>;
    private readonly batchNotifications: Map<string, EmailData[]>;
    private readonly rateLimit: Map<string, number>;
    private readonly batchInterval = 900; // 15 minutes
    private readonly minInterval = 300; // 5 minutes

    constructor(
        @inject(TYPES.Config) private config: Config,
        @inject(TYPES.Logger) private logger: Logger,
        @inject(TYPES.NotificationMetrics) private metrics: NotificationMetrics
    ) {
        this.transporter = nodemailer.createTransport({
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: {
                user: this.config.smtp.user,
                pass: this.config.smtp.password
            }
        });

        this.emailQueue = new Queue<EmailData>();
        this.batchNotifications = new Map();
        this.rateLimit = new Map();

        this.startProcessing();
    }

    @monitor('email.queue')
    async sendEmail(data: EmailData): Promise<void> {
        if (this.isRateLimited(data.to)) {
            this.logger.info('Email rate limited', { to: data.to });
            return;
        }

        await this.emailQueue.enqueue(data);
        this.updateRateLimit(data.to);
    }

    private async startProcessing(): Promise<void> {
        while (true) {
            try {
                const data = await this.emailQueue.dequeue();
                if (data) {
                    await this.handleEmailData(data);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                this.logger.error('Error processing email queue', { error });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    @monitor('email.process')
    private async handleEmailData(data: EmailData): Promise<void> {
        const batch = this.batchNotifications.get(data.to) || [];
        batch.push(data);
        this.batchNotifications.set(data.to, batch);

        // Check if we should send batch
        if (this.shouldSendBatch(data.to, batch)) {
            await this.sendBatchedEmail(data.to, batch);
            this.batchNotifications.delete(data.to);
        }
    }

    @monitor('email.send')
    private async sendBatchedEmail(to: string, notifications: EmailData[]): Promise<void> {
        if (notifications.length === 0) return;

        try {
            const html = this.formatBatchedEmail(notifications);
            
            await this.transporter.sendMail({
                from: this.config.smtp.from,
                to,
                subject: notifications.length === 1 
                    ? notifications[0].subject 
                    : `You have ${notifications.length} new notifications`,
                html
            });

            this.metrics.incrementSent('email');
        } catch (error) {
            this.logger.error('Failed to send email', { error, to });
            this.metrics.incrementFailed('email');
            throw error;
        }
    }

    private formatBatchedEmail(notifications: EmailData[]): string {
        if (notifications.length === 1) {
            return notifications[0].html;
        }

        return `
            <h1>You have ${notifications.length} new notifications</h1>
            ${notifications.map(n => `
                <div style="margin: 20px 0; padding: 10px; border: 1px solid #eee;">
                    <h2>${n.subject}</h2>
                    ${n.html}
                </div>
            `).join('')}
        `;
    }

    private isRateLimited(to: string): boolean {
        const lastSent = this.rateLimit.get(to);
        if (!lastSent) return false;

        const timeSinceLastEmail = Date.now() - lastSent;
        return timeSinceLastEmail < this.minInterval * 1000;
    }

    private updateRateLimit(to: string): void {
        this.rateLimit.set(to, Date.now());
    }

    private shouldSendBatch(to: string, batch: EmailData[]): boolean {
        if (batch.length === 0) return false;
        if (batch.length >= 5) return true;

        const oldestNotification = batch[0];
        const timeSinceFirst = Date.now() - new Date(oldestNotification.createdAt).getTime();
        return timeSinceFirst >= this.batchInterval * 1000;
    }
}
