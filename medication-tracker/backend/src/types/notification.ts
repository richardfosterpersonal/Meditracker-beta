import { z } from 'zod';

export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority = typeof NotificationPriority[keyof typeof NotificationPriority];

export const NotificationType = {
  MEDICATION_REMINDER: 'medication_reminder',
  REFILL_REMINDER: 'refill_reminder',
  INTERACTION_ALERT: 'interaction_alert',
  NATURAL_ALTERNATIVE: 'natural_alternative',
  MISSED_MEDICATION: 'missed_medication',
  EMERGENCY: 'emergency',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const notificationSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
  notifyCarers: z.boolean().default(false),
  scheduleTime: z.date().optional(),
  sent: z.boolean().default(false),
  sentAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Notification = z.infer<typeof notificationSchema>;

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  emergencyContactId?: string;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  timezone: string;
  batchNotifications: boolean;
  batchInterval: number; // minutes
  notificationTypes: {
    [key in NotificationType]: {
      enabled: boolean;
      priority: NotificationPriority;
      notifyCarers: boolean;
    };
  };
}
