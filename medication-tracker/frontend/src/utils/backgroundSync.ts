import { offlineStorage } from './offlineStorage';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface SyncOperation {
  type: 'MEDICATION_LOG' | 'MEDICATION_UPDATE' | 'DOSE_LOG';
  data: any;
  timestamp: number;
}

class BackgroundSync {
  private syncInProgress = false;
  private readonly SYNC_QUEUE_KEY = 'sync-queue';
  private readonly API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  private async getSyncQueue(): Promise<SyncOperation[]> {
    const queue = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  private async saveSyncQueue(queue: SyncOperation[]): Promise<void> {
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'timestamp'>): Promise<void> {
    const queue = await this.getSyncQueue();
    queue.push({ ...operation, timestamp: Date.now() });
    await this.saveSyncQueue(queue);
    this.attemptSync();
  }

  private async syncMedicationLog(data: any): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/api/medications`, data);
      await offlineStorage.updateMedicationSyncStatus(data.id, 'synced');
    } catch (error) {
      console.error('Failed to sync medication log:', error);
      throw error;
    }
  }

  private async syncMedicationUpdate(data: any): Promise<void> {
    try {
      await axios.put(`${this.API_BASE_URL}/api/medications/${data.id}`, data);
      await offlineStorage.updateMedicationSyncStatus(data.id, 'synced');
    } catch (error) {
      console.error('Failed to sync medication update:', error);
      throw error;
    }
  }

  private async syncDoseLog(data: any): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/api/doses`, data);
      await offlineStorage.updateDoseStatus(data.id, 'synced');
    } catch (error) {
      console.error('Failed to sync dose log:', error);
      throw error;
    }
  }

  async attemptSync(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    const queue = await this.getSyncQueue();
    const newQueue: SyncOperation[] = [];
    let syncFailed = false;

    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'MEDICATION_LOG':
            await this.syncMedicationLog(operation.data);
            break;
          case 'MEDICATION_UPDATE':
            await this.syncMedicationUpdate(operation.data);
            break;
          case 'DOSE_LOG':
            await this.syncDoseLog(operation.data);
            break;
        }
      } catch (error) {
        console.error('Sync operation failed:', error);
        syncFailed = true;
        // Keep failed operations in queue if they're less than 24 hours old
        if (Date.now() - operation.timestamp < 24 * 60 * 60 * 1000) {
          newQueue.push(operation);
        }
      }
    }

    await this.saveSyncQueue(newQueue);
    this.syncInProgress = false;

    if (newQueue.length > 0) {
      toast.error('Some changes could not be synced. Will retry later.');
    } else if (queue.length > 0 && !syncFailed) {
      toast.success('All changes synced successfully!');
      await offlineStorage.clearSyncedData();
    }
  }

  // Initialize sync listener
  initialize(): void {
    window.addEventListener('online', () => {
      toast.success('Back online!');
      this.attemptSync();
    });

    // Attempt sync on initialization in case there are pending items
    if (navigator.onLine) {
      this.attemptSync();
    }
  }
}

export const backgroundSync = new BackgroundSync();
export default backgroundSync;
