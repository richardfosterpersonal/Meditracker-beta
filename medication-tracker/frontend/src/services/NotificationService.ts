import { Notification } from '../types/notification';

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.init();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async init() {
    if ('Notification' in window) {
      this.permission = await Notification.permission;
      if (this.permission === 'default') {
        await this.requestPermission();
      }
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public async sendNotification(title: string, options: NotificationOptions = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  public async scheduleMedicationReminder(
    medicationName: string,
    scheduledTime: Date,
    dosage: string
  ) {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay < 0) return;

    setTimeout(() => {
      this.sendNotification(`Time to take ${medicationName}`, {
        body: `It's time to take ${dosage} of ${medicationName}`,
        tag: `medication-${medicationName}-${scheduledTime.getTime()}`,
        renotify: true,
      });
    }, delay);
  }

  public async sendMissedDoseNotification(
    medicationName: string,
    scheduledTime: Date
  ) {
    return this.sendNotification(`Missed dose: ${medicationName}`, {
      body: `You missed your scheduled dose of ${medicationName} at ${scheduledTime.toLocaleTimeString()}`,
      tag: `missed-${medicationName}-${scheduledTime.getTime()}`,
      requireInteraction: true,
    });
  }

  public async sendLowSupplyNotification(
    medicationName: string,
    remainingDoses: number
  ) {
    return this.sendNotification(`Low Supply Alert: ${medicationName}`, {
      body: `You have ${remainingDoses} doses remaining of ${medicationName}. Please refill soon.`,
      tag: `supply-${medicationName}`,
    });
  }
}

export default NotificationService;
