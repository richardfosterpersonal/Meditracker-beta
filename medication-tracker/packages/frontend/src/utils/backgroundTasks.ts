import { KeyRotationService } from './keyRotation';
import { NotificationRetryQueue } from './retryStrategy';

export class BackgroundTasks {
  private static isRunning = false;
  private static readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly QUEUE_PROCESSING_INTERVAL = 5 * 60 * 1000;   // 5 minutes

  static async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial runs
    await this.rotateKeysIfNeeded();
    await this.processNotificationQueue();

    // Set up intervals
    setInterval(() => this.rotateKeysIfNeeded(), this.KEY_ROTATION_INTERVAL);
    setInterval(() => this.processNotificationQueue(), this.QUEUE_PROCESSING_INTERVAL);

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  static async stop(): Promise<void> {
    this.isRunning = false;
  }

  private static async rotateKeysIfNeeded(): Promise<void> {
    try {
      const currentKey = await KeyRotationService.getCurrentKey();
      const expiryDate = new Date(currentKey.expiresAt);

      if (expiryDate <= new Date()) {
        console.log('Rotating encryption keys...');
        await KeyRotationService.rotateKey();
        await KeyRotationService.cleanupOldKeys();
        console.log('Key rotation complete');
      }
    } catch (error) {
      console.error('Error during key rotation:', error);
    }
  }

  private static async processNotificationQueue(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      await NotificationRetryQueue.processQueue();
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  private static async handleOnline(): Promise<void> {
    console.log('Connection restored. Processing pending notifications...');
    await this.processNotificationQueue();
  }

  private static handleOffline(): void {
    console.log('Connection lost. Notifications will be queued for retry.');
  }
}

// Initialize background tasks when the app starts
if (typeof window !== 'undefined') {
  BackgroundTasks.start().catch(error => {
    console.error('Failed to start background tasks:', error);
  });
}
