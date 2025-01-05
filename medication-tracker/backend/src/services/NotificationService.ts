import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/config/types.js';
import { ApiError } from '@/utils/errors.js';
import { auditLog } from '@/utils/audit.js';
import { monitorPerformance } from '@/utils/monitoring.js';
import { EmailService } from './EmailService.js';
import { INotificationService } from '@/interfaces/INotificationService.js';
import { EmergencyNotification } from '@/types/emergency.js';
import { 
  Notification,
  NotificationPreferences,
  NotificationPriority,
  NotificationType,
  notificationSchema 
} from '@/types/notification.js';
import { prisma } from '@/config/database.js';
import { differenceInMinutes } from 'date-fns';

@injectable()
export class NotificationService implements INotificationService {
  private readonly emailService: EmailService;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.EmailService) emailService: EmailService
  ) {
    this.emailService = emailService;
  }

  @monitorPerformance('send_emergency_notification')
  public async sendEmergencyNotification(notification: EmergencyNotification): Promise<void> {
    try {
      // Create emergency notification
      const emergencyNotification: Notification = {
        userId: notification.userId,
        type: NotificationType.EMERGENCY,
        priority: NotificationPriority.URGENT,
        title: 'Emergency Alert',
        message: notification.message,
        metadata: notification.metadata,
        notifyCarers: true,
        sent: false,
      };

      // Create and send notification
      await this.createNotification(emergencyNotification);
      await this.sendNotification(emergencyNotification);

      // Notify emergency contacts
      if (notification.emergencyContactId) {
        const emergencyContactNotification: Notification = {
          userId: notification.emergencyContactId,
          type: NotificationType.EMERGENCY,
          priority: NotificationPriority.URGENT,
          title: 'Emergency Contact Alert',
          message: `Emergency alert for your patient: ${notification.message}`,
          metadata: notification.metadata,
          notifyCarers: false,
          sent: false,
        };
        await this.createNotification(emergencyContactNotification);
        await this.sendNotification(emergencyContactNotification);
      }

      await auditLog('notification', 'emergency_sent', {
        userId: notification.userId,
        type: NotificationType.EMERGENCY,
      });
    } catch (error) {
      this.logger.error('Error sending emergency notification:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to send emergency notification', 500);
    }
  }

  @monitorPerformance('send_notification')
  public async sendNotification(notification: Notification): Promise<void> {
    try {
      // Get user preferences
      const prefs = await this.getNotificationPreferences(notification.userId);
      
      // Check if notification type is enabled
      if (!prefs.notificationTypes[notification.type]?.enabled) {
        this.logger.info(`Notification type ${notification.type} disabled for user ${notification.userId}`);
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours(prefs) && notification.priority !== NotificationPriority.URGENT) {
        this.logger.info(`Notification delayed due to quiet hours for user ${notification.userId}`);
        await this.scheduleNotification({
          ...notification,
          scheduleTime: this.getQuietHoursEnd(prefs),
        });
        return;
      }

      // Send through enabled channels
      const sendPromises: Promise<void>[] = [];

      if (prefs.emailNotifications) {
        sendPromises.push(this.emailService.sendNotificationEmail(notification));
      }

      // Add other notification channels here (SMS, push, etc.)

      await Promise.all(sendPromises);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          sent: true,
          sentAt: new Date(),
        },
      });

      await auditLog('notification', 'sent', {
        userId: notification.userId,
        type: notification.type,
      });
    } catch (error) {
      this.logger.error('Error sending notification:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to send notification', 500);
    }
  }

  @monitorPerformance('create_notification')
  public async createNotification(notification: Notification): Promise<Notification> {
    try {
      // Validate notification data
      const validatedData = notificationSchema.parse(notification);

      // Create notification record
      const created = await prisma.notification.create({
        data: {
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await auditLog('notification', 'created', {
        userId: notification.userId,
        type: notification.type,
      });

      return created;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to create notification', 500);
    }
  }

  @monitorPerformance('get_pending_notifications')
  public async getPendingNotifications(
    userId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<Notification[]> {
    try {
      return await prisma.notification.findMany({
        where: {
          userId,
          sent: false,
          scheduleTime: {
            gte: startTime,
            lte: endTime,
          },
        },
        orderBy: {
          scheduleTime: 'asc',
        },
      });
    } catch (error) {
      this.logger.error('Error getting pending notifications:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to get pending notifications', 500);
    }
  }

  @monitorPerformance('schedule_notification')
  public async scheduleNotification(notification: Notification): Promise<void> {
    try {
      if (!notification.scheduleTime) {
        throw new ApiError('Schedule time is required for scheduling notifications', 400);
      }

      await this.createNotification({
        ...notification,
        sent: false,
      });

      await auditLog('notification', 'scheduled', {
        userId: notification.userId,
        type: notification.type,
        scheduleTime: notification.scheduleTime,
      });
    } catch (error) {
      this.logger.error('Error scheduling notification:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to schedule notification', 500);
    }
  }

  @monitorPerformance('process_scheduled_notifications')
  public async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          sent: false,
          scheduleTime: {
            lte: now,
          },
        },
      });

      for (const notification of pendingNotifications) {
        await this.sendNotification(notification);
      }

      await auditLog('notification', 'processed_scheduled', {
        count: pendingNotifications.length,
      });
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to process scheduled notifications', 500);
    }
  }

  @monitorPerformance('get_notification_preferences')
  public async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const prefs = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (!prefs) {
        return this.getDefaultPreferences(userId);
      }

      return prefs;
    } catch (error) {
      this.logger.error('Error getting notification preferences:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to get notification preferences', 500);
    }
  }

  @monitorPerformance('update_notification_preferences')
  public async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const updated = await prisma.notificationPreferences.upsert({
        where: { userId },
        create: {
          ...this.getDefaultPreferences(userId),
          ...preferences,
        },
        update: preferences,
      });

      await auditLog('notification', 'preferences_updated', {
        userId,
      });

      return updated;
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to update notification preferences', 500);
    }
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      timezone: 'UTC',
      batchNotifications: false,
      batchInterval: 15, // 15 minutes
      notificationTypes: {
        [NotificationType.MEDICATION_REMINDER]: {
          enabled: true,
          priority: NotificationPriority.HIGH,
          notifyCarers: true,
        },
        [NotificationType.REFILL_REMINDER]: {
          enabled: true,
          priority: NotificationPriority.NORMAL,
          notifyCarers: true,
        },
        [NotificationType.INTERACTION_ALERT]: {
          enabled: true,
          priority: NotificationPriority.HIGH,
          notifyCarers: true,
        },
        [NotificationType.NATURAL_ALTERNATIVE]: {
          enabled: true,
          priority: NotificationPriority.LOW,
          notifyCarers: false,
        },
        [NotificationType.MISSED_MEDICATION]: {
          enabled: true,
          priority: NotificationPriority.HIGH,
          notifyCarers: true,
        },
        [NotificationType.EMERGENCY]: {
          enabled: true,
          priority: NotificationPriority.URGENT,
          notifyCarers: true,
        },
      },
    };
  }

  private isInQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const [startHour, startMinute] = prefs.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = prefs.quietHoursEnd.split(':').map(Number);

    const start = new Date(now);
    start.setHours(startHour, startMinute, 0);

    const end = new Date(now);
    end.setHours(endHour, endMinute, 0);

    return now >= start && now <= end;
  }

  private getQuietHoursEnd(prefs: NotificationPreferences): Date {
    if (!prefs.quietHoursEnd) {
      return new Date();
    }

    const [hour, minute] = prefs.quietHoursEnd.split(':').map(Number);
    const end = new Date();
    end.setHours(hour, minute, 0);

    // If end time is in the past, set it to tomorrow
    if (end < new Date()) {
      end.setDate(end.getDate() + 1);
    }

    return end;
  }
}
