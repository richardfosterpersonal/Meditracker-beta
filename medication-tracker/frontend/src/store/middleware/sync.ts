import { Middleware } from '@reduxjs/toolkit';
import { openDB, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  action: any;
  timestamp: number;
  retries: number;
}

interface MediTrackerDB extends IDBPDatabase {
  syncQueue: IDBPDatabase['objectStore'];
}

const DB_NAME = 'MediTracker';
const SYNC_STORE = 'syncQueue';
const MAX_RETRIES = 3;

class SyncManager {
  private db: MediTrackerDB | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
  }

  private async initDB() {
    this.db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE, { keyPath: 'id' });
        }
      },
    }) as MediTrackerDB;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  public async queueAction(action: any): Promise<void> {
    if (!this.db) return;

    const syncItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
    };

    await this.db.add(SYNC_STORE, syncItem);
  }

  public async processSyncQueue(): Promise<void> {
    if (!this.db || !this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const tx = this.db.transaction(SYNC_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_STORE);
      const items = await store.getAll();

      for (const item of items) {
        if (item.retries >= MAX_RETRIES) {
          // Move to failed queue or handle differently
          await store.delete(item.id);
          continue;
        }

        try {
          // Attempt to replay the action
          await this.replayAction(item.action);
          await store.delete(item.id);
        } catch (error) {
          // Update retry count
          item.retries++;
          await store.put(item);
        }
      }

      await tx.done;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async replayAction(action: any): Promise<void> {
    // Implementation depends on your API client
    // This is where you would make the actual API call
    throw new Error('Not implemented');
  }
}

const syncManager = new SyncManager();

export const syncMiddleware: Middleware = () => (next) => async (action) => {
  // Actions that should be queued when offline
  const syncableActions = [
    'medication/createMedication',
    'medication/updateMedication',
    'medication/deleteMedication',
    'medication/addMedicationLog',
  ];

  if (!navigator.onLine && syncableActions.includes(action.type)) {
    await syncManager.queueAction(action);
    // Optimistically update the UI
    return next({
      ...action,
      meta: {
        ...action.meta,
        offline: true,
      },
    });
  }

  return next(action);
};
