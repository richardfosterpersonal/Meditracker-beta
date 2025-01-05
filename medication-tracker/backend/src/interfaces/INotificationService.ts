import { EmergencyNotification } from '@/types/emergency.js';
import { Notification, NotificationPreferences } from '@/types/notification.js';

export interface INotificationService {
  /**
   * Send an emergency notification to the user and their carers
   * @param notification Emergency notification details
   */
  sendEmergencyNotification(notification: EmergencyNotification): Promise<void>;

  /**
   * Send a notification through appropriate channels based on user preferences
   * @param notification The notification to send
   */
  sendNotification(notification: Notification): Promise<void>;

  /**
   * Create a new notification and optionally notify carers
   * @param notification The notification to create
   */
  createNotification(notification: Notification): Promise<Notification>;

  /**
   * Get pending notifications for a user within a time range
   * @param userId User identifier
   * @param startTime Optional start time
   * @param endTime Optional end time
   */
  getPendingNotifications(
    userId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<Notification[]>;

  /**
   * Schedule a notification for future delivery
   * @param notification The notification to schedule
   */
  scheduleNotification(notification: Notification): Promise<void>;

  /**
   * Process all scheduled notifications that are due
   */
  processScheduledNotifications(): Promise<void>;

  /**
   * Get notification preferences for a user
   * @param userId User identifier
   */
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;

  /**
   * Update notification preferences for a user
   * @param userId User identifier
   * @param preferences Updated preferences
   */
  updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences>;
}
