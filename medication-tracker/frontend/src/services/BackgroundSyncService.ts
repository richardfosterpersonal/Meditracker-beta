import { liabilityProtection } from '../utils/liabilityProtection';

interface SyncOperation {
  id: string;
  type: 'MEDICATION_UPDATE' | 'EMERGENCY_CONTACT' | 'FAMILY_UPDATE';
  data: any;
  timestamp: string;
  retryCount: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class BackgroundSyncService {
  private readonly DB_NAME = 'MedicationTrackerSync';
  private readonly STORE_NAME = 'pendingOperations';
  private readonly MAX_RETRIES = 5;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    try {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        liabilityProtection.logLiabilityRisk(
          'SYNC_DB_ERROR',
          'HIGH',
          { event }
        );
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        liabilityProtection.logCriticalAction(
          'SYNC_DB_INITIALIZED',
          'current-user',
          { timestamp: new Date().toISOString() }
        );
      };
    } catch (error) {
      console.error('Failed to initialize sync database:', error);
      liabilityProtection.logLiabilityRisk(
        'SYNC_DB_INIT_FAILED',
        'HIGH',
        { error }
      );
    }
  }

  public async queueOperation(
    type: SyncOperation['type'],
    data: any,
    priority: SyncOperation['priority']
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      priority
    };

    try {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      await store.add(operation);

      // Log critical operations for liability
      if (priority === 'HIGH' || priority === 'CRITICAL') {
        liabilityProtection.logCriticalAction(
          'CRITICAL_SYNC_QUEUED',
          'current-user',
          {
            operationType: type,
            priority,
            timestamp: operation.timestamp
          },
          true
        );
      }

      // Trigger sync if not already in progress
      if (!this.syncInProgress) {
        this.startSync();
      }

      return operation.id;
    } catch (error) {
      console.error('Failed to queue operation:', error);
      liabilityProtection.logLiabilityRisk(
        'SYNC_QUEUE_FAILED',
        'MEDIUM',
        { error, operation }
      );
      throw error;
    }
  }

  private async startSync(): Promise<void> {
    if (this.syncInProgress || !this.db) return;

    this.syncInProgress = true;
    try {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const operations = await store.getAll();

      // Sort by priority and timestamp
      operations.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await store.delete(operation.id);
        } catch (error) {
          operation.retryCount++;
          if (operation.retryCount >= this.MAX_RETRIES) {
            await store.delete(operation.id);
            liabilityProtection.logLiabilityRisk(
              'SYNC_MAX_RETRIES_EXCEEDED',
              'HIGH',
              { operation, error }
            );
          } else {
            await store.put(operation);
          }
        }
      }
    } catch (error) {
      console.error('Sync process failed:', error);
      liabilityProtection.logLiabilityRisk(
        'SYNC_PROCESS_FAILED',
        'HIGH',
        { error }
      );
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    // Log processing of critical operations
    if (operation.priority === 'HIGH' || operation.priority === 'CRITICAL') {
      liabilityProtection.logCriticalAction(
        'CRITICAL_SYNC_PROCESSING',
        'current-user',
        {
          operationType: operation.type,
          priority: operation.priority,
          timestamp: new Date().toISOString()
        },
        true
      );
    }

    switch (operation.type) {
      case 'MEDICATION_UPDATE':
        await this.processMedicationUpdate(operation.data);
        break;
      case 'EMERGENCY_CONTACT':
        await this.processEmergencyContact(operation.data);
        break;
      case 'FAMILY_UPDATE':
        await this.processFamilyUpdate(operation.data);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processMedicationUpdate(data: any): Promise<void> {
    // Implementation for medication updates
    // This would include API calls and data validation
  }

  private async processEmergencyContact(data: any): Promise<void> {
    // Implementation for emergency contact updates
    // This would include verification and notification
  }

  private async processFamilyUpdate(data: any): Promise<void> {
    // Implementation for family member updates
    // This would include permission checks and notifications
  }

  public async getQueueStatus(): Promise<{
    pendingCount: number;
    criticalCount: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const operations = await store.getAll();

      return {
        pendingCount: operations.length,
        criticalCount: operations.filter(op => 
          op.priority === 'HIGH' || op.priority === 'CRITICAL'
        ).length
      };
    } catch (error) {
      console.error('Failed to get queue status:', error);
      throw error;
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService();
