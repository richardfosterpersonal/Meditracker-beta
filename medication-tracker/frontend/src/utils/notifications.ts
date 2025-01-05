import { toast } from 'react-hot-toast';
import { EncryptionService, NotificationData, isEncryptedData } from './encryption';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

class NotificationService {
  private vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    this.serviceWorkerRegistration = registration;

    try {
      const permission = await this.requestNotificationPermission();
      if (permission === 'granted') {
        await this.subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission has been denied');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  private async subscribeToPushNotifications(): Promise<void> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker not registered');
      }

      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.vapidPublicKey
        });

        // Send the subscription to your backend
        await this.sendSubscriptionToBackend(subscription);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }
  }

  private async storeNotification(notification: NotificationData): Promise<void> {
    try {
      const encryptedNotification = await EncryptionService.encryptNotification(notification);
      await this.db.put('notifications', encryptedNotification, notification.id);
    } catch (error) {
      console.error('Failed to store notification:', error);
      throw new Error('Failed to store notification');
    }
  }

  private async getNotification(id: string): Promise<NotificationData | null> {
    try {
      const data = await this.db.get('notifications', id);
      if (!data) return null;

      if (isEncryptedData(data)) {
        return await EncryptionService.decryptNotification(data);
      }
      
      // Handle legacy unencrypted data
      return data as NotificationData;
    } catch (error) {
      console.error('Failed to retrieve notification:', error);
      return null;
    }
  }

  async scheduleNotification(notification: NotificationData): Promise<void> {
    await this.storeNotification(notification);
    
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const timestamp = new Date(notification.timestamp).getTime();
      
      await registration.showNotification(notification.title, {
        body: notification.body,
        tag: notification.id,
        data: { notificationId: notification.id },
        timestamp,
      });
    }
  }

  async showNotification({ title, body, icon, badge, tag, data, actions }: NotificationOptions): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.warn('Service Worker not registered, falling back to toast notification');
      toast(body, { duration: 5000 });
      return;
    }

    try {
      await this.serviceWorkerRegistration.showNotification(title, {
        body,
        icon: icon || '/logo192.png',
        badge: badge || '/logo192.png',
        tag,
        data,
        actions,
        requireInteraction: true,
        vibrate: [200, 100, 200],
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      toast(body, { duration: 5000 });
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
