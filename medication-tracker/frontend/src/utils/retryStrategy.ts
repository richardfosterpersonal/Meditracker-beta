interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  timeout?: number;
}

interface RetryState {
  attempt: number;
  error?: Error;
  startTime: number;
}

export class RetryStrategy {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 30000,   // 30 seconds
    backoffFactor: 2,
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const fullOptions: RetryOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const state: RetryState = {
      attempt: 0,
      startTime: Date.now(),
    };

    while (state.attempt < fullOptions.maxAttempts) {
      try {
        return await this.executeWithTimeout(operation, fullOptions.timeout);
      } catch (error) {
        state.attempt++;
        state.error = error as Error;

        if (state.attempt === fullOptions.maxAttempts) {
          throw new Error(`Operation failed after ${state.attempt} attempts: ${state.error.message}`);
        }

        const delay = this.calculateDelay(state.attempt, fullOptions);
        await this.sleep(delay);
      }
    }

    throw new Error('Unexpected retry failure');
  }

  private static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    if (!timeout) {
      return operation();
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  private static calculateDelay(attempt: number, options: RetryOptions): number {
    const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
    return Math.min(exponentialDelay + jitter, options.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class NotificationRetryQueue {
  private static readonly QUEUE_NAME = 'notification-retry-queue';
  private static readonly MAX_QUEUE_SIZE = 100;

  static async addToQueue(notification: any): Promise<void> {
    const db = await openDB('notifications', 1);
    const queue = await db.get(this.QUEUE_NAME, 'queue') || [];

    if (queue.length >= this.MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest item if queue is full
    }

    queue.push({
      notification,
      attempts: 0,
      lastAttempt: null,
      addedAt: new Date().toISOString(),
    });

    await db.put(this.QUEUE_NAME, queue, 'queue');
  }

  static async processQueue(): Promise<void> {
    const db = await openDB('notifications', 1);
    const queue = await db.get(this.QUEUE_NAME, 'queue') || [];

    if (queue.length === 0) return;

    const updatedQueue = [];
    for (const item of queue) {
      try {
        await RetryStrategy.withRetry(
          async () => {
            // Attempt to process the notification
            await this.processNotification(item.notification);
          },
          {
            maxAttempts: 3,
            initialDelay: 2000,
            timeout: 10000,
          }
        );
      } catch (error) {
        item.attempts++;
        item.lastAttempt = new Date().toISOString();

        // Keep in queue if under max attempts
        if (item.attempts < 5) {
          updatedQueue.push(item);
        } else {
          // Log failed notification for monitoring
          console.error('Notification failed after max attempts:', {
            notification: item.notification,
            attempts: item.attempts,
            error,
          });
        }
      }
    }

    await db.put(this.QUEUE_NAME, updatedQueue, 'queue');
  }

  private static async processNotification(notification: any): Promise<void> {
    // Implementation depends on notification type
    if (notification.type === 'push') {
      await this.processPushNotification(notification);
    } else {
      await this.processLocalNotification(notification);
    }
  }

  private static async processPushNotification(notification: any): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      body: notification.body,
      tag: notification.id,
      data: notification.data,
    });
  }

  private static async processLocalNotification(notification: any): Promise<void> {
    // Handle local notification
    new Notification(notification.title, {
      body: notification.body,
      tag: notification.id,
    });
  }
}
