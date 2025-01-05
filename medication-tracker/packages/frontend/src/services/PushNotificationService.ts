import { liabilityProtection } from '../utils/liabilityProtection';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private readonly vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported');
      }

      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );

      // Log initialization for liability
      liabilityProtection.logCriticalAction(
        'PUSH_NOTIFICATION_INIT',
        'current-user',
        { timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      liabilityProtection.logLiabilityRisk(
        'PUSH_INIT_FAILED',
        'MEDIUM',
        { error }
      );
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      
      // Log permission request for liability
      liabilityProtection.logCriticalAction(
        'PUSH_PERMISSION_REQUEST',
        'current-user',
        { 
          permission,
          timestamp: new Date().toISOString()
        }
      );

      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      liabilityProtection.logLiabilityRisk(
        'PUSH_PERMISSION_ERROR',
        'MEDIUM',
        { error }
      );
      return false;
    }
  }

  public async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service worker not registered');
      }

      // Get push subscription
      const existingSubscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (existingSubscription) {
        this.subscription = existingSubscription;
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidPublicKey
      });

      this.subscription = subscription;

      // Log subscription for liability
      liabilityProtection.logCriticalAction(
        'PUSH_SUBSCRIPTION_CREATED',
        'current-user',
        { 
          endpoint: subscription.endpoint,
          timestamp: new Date().toISOString()
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      liabilityProtection.logLiabilityRisk(
        'PUSH_SUBSCRIPTION_ERROR',
        'HIGH',
        { error }
      );
      return null;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        return true;
      }

      const result = await this.subscription.unsubscribe();
      
      // Log unsubscription for liability
      liabilityProtection.logCriticalAction(
        'PUSH_UNSUBSCRIPTION',
        'current-user',
        { timestamp: new Date().toISOString() }
      );

      return result;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      liabilityProtection.logLiabilityRisk(
        'PUSH_UNSUBSCRIBE_ERROR',
        'MEDIUM',
        { error }
      );
      return false;
    }
  }

  public async sendNotification(
    title: string,
    options: NotificationOptions & { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }
  ): Promise<void> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service worker not registered');
      }

      await this.serviceWorkerRegistration.showNotification(title, options);

      // Log critical notifications for liability
      if (options.priority === 'HIGH' || options.priority === 'CRITICAL') {
        liabilityProtection.logCriticalAction(
          'CRITICAL_NOTIFICATION_SENT',
          'current-user',
          {
            title,
            priority: options.priority,
            timestamp: new Date().toISOString()
          },
          true
        );
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      liabilityProtection.logLiabilityRisk(
        'NOTIFICATION_SEND_ERROR',
        'HIGH',
        { error, title, options }
      );
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
