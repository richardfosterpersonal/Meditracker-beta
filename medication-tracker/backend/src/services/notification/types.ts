/**
 * Notification System Types
 */

export interface NotificationType {
    title: string;
    priority: 'high' | 'medium' | 'low';
    notifyCarers: boolean;
}

export interface NotificationConfig {
    types: {
        [key: string]: NotificationType;
    };
}

export interface NotificationPreferences {
    emailEnabled: boolean;
    pushEnabled: boolean;
    reminderTime: string;
    timezone: string;
    advanceNotice: number;
}

export interface Notification {
    id: number;
    userId: number;
    medicationId?: number;
    type: string;
    status: 'scheduled' | 'sent' | 'failed' | 'acknowledged';
    priority: string;
    errorMessage?: string;
    data?: Record<string, any>;
    createdAt: Date;
    scheduledTime: Date;
    sentAt?: Date;
    acknowledgedAt?: Date;
}

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    notificationId?: number;
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
}

export interface NotificationRepository {
    save(notification: Notification): Promise<Notification>;
    getById(id: number): Promise<Notification | null>;
    getForUser(userId: number, unreadOnly?: boolean, limit?: number): Promise<Notification[]>;
    getForCarer(carerId: number, unreadOnly?: boolean, limit?: number): Promise<Notification[]>;
    markAsRead(notificationIds: number[]): Promise<void>;
    delete(id: number): Promise<void>;
}

export interface EmailSender {
    sendEmail(data: EmailData): Promise<void>;
}

export interface PushSender {
    sendPush(subscription: PushSubscription, title: string, body: string, data?: any): Promise<void>;
}

export interface NotificationMetrics {
    incrementSent(type: string): void;
    incrementFailed(type: string): void;
    observeLatency(type: string, duration: number): void;
}
