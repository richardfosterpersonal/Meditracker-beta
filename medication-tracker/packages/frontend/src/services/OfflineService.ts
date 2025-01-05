import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BehaviorSubject } from 'rxjs';

interface MediTrackerDB extends DBSchema {
  offlineChanges: {
    key: string;
    value: {
      id: string;
      type: 'medication' | 'schedule' | 'adherence' | 'emergency';
      timestamp: number;
      data: any;
      synced: boolean;
    };
    indexes: { 'by-type': string; 'by-sync': boolean };
  };
  medications: {
    key: string;
    value: any;
    indexes: { 'by-name': string };
  };
  emergencyContacts: {
    key: string;
    value: any;
  };
}

export interface OfflineChange {
  id: string;
  type: 'medication' | 'schedule' | 'adherence' | 'emergency';
  timestamp: number;
  data: any;
  synced: boolean;
}

class OfflineService {
  private db: IDBPDatabase<MediTrackerDB> | null = null;
  private readonly DB_NAME = 'MediTracker';
  private readonly DB_VERSION = 1;

  public isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  public syncInProgress$ = new BehaviorSubject<boolean>(false);
  public pendingChanges$ = new BehaviorSubject<number>(0);

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
  }

  private async initDB() {
    this.db = await openDB<MediTrackerDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Offline changes store
        const changeStore = db.createObjectStore('offlineChanges', {
          keyPath: 'id',
        });
        changeStore.createIndex('by-type', 'type');
        changeStore.createIndex('by-sync', 'synced');

        // Medications store
        const medStore = db.createObjectStore('medications', {
          keyPath: 'id',
        });
        medStore.createIndex('by-name', 'name');

        // Emergency contacts store
        db.createObjectStore('emergencyContacts', {
          keyPath: 'id',
        });
      },
    });

    await this.updatePendingChangesCount();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.syncChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  private async updatePendingChangesCount() {
    if (!this.db) return;

    const count = await this.db.getAllFromIndex('offlineChanges', 'by-sync', false);
    this.pendingChanges$.next(count.length);
  }

  public async queueChange(
    type: 'medication' | 'schedule' | 'adherence' | 'emergency',
    data: any
  ): Promise<void> {
    if (!this.db) return;

    const change: OfflineChange = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
      synced: false,
    };

    await this.db.add('offlineChanges', change);
    await this.updatePendingChangesCount();

    if (this.isOnline$.value) {
      this.syncChanges();
    }
  }

  public async syncChanges(): Promise<void> {
    if (!this.db || this.syncInProgress$.value || !this.isOnline$.value) return;

    try {
      this.syncInProgress$.next(true);
      const changes = await this.db.getAllFromIndex('offlineChanges', 'by-sync', false);

      for (const change of changes) {
        try {
          await this.processChange(change);
          await this.db.put('offlineChanges', { ...change, synced: true });
        } catch (error) {
          console.error(`Failed to sync change: ${change.id}`, error);
          // Implement retry logic here if needed
        }
      }
    } finally {
      this.syncInProgress$.next(false);
      await this.updatePendingChangesCount();
    }
  }

  private async processChange(change: OfflineChange): Promise<void> {
    switch (change.type) {
      case 'medication':
        await this.syncMedicationChange(change.data);
        break;
      case 'schedule':
        await this.syncScheduleChange(change.data);
        break;
      case 'adherence':
        await this.syncAdherenceChange(change.data);
        break;
      case 'emergency':
        await this.syncEmergencyChange(change.data);
        break;
    }
  }

  private async syncMedicationChange(data: any): Promise<void> {
    const response = await fetch('/api/medications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to sync medication change');
    }
  }

  private async syncScheduleChange(data: any): Promise<void> {
    const response = await fetch(`/api/medications/${data.medicationId}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.schedule),
    });

    if (!response.ok) {
      throw new Error('Failed to sync schedule change');
    }
  }

  private async syncAdherenceChange(data: any): Promise<void> {
    const response = await fetch(`/api/medications/${data.medicationId}/adherence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.adherence),
    });

    if (!response.ok) {
      throw new Error('Failed to sync adherence change');
    }
  }

  private async syncEmergencyChange(data: any): Promise<void> {
    const response = await fetch('/api/emergency/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to sync emergency notification');
    }
  }

  public async cacheMedication(medication: any): Promise<void> {
    if (!this.db) return;
    await this.db.put('medications', medication);
  }

  public async getCachedMedication(id: string): Promise<any | undefined> {
    if (!this.db) return undefined;
    return await this.db.get('medications', id);
  }

  public async getAllCachedMedications(): Promise<any[]> {
    if (!this.db) return [];
    return await this.db.getAll('medications');
  }

  public async cacheEmergencyContact(contact: any): Promise<void> {
    if (!this.db) return;
    await this.db.put('emergencyContacts', contact);
  }

  public async getCachedEmergencyContacts(): Promise<any[]> {
    if (!this.db) return [];
    return await this.db.getAll('emergencyContacts');
  }

  public async clearCache(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('medications');
    await this.db.clear('emergencyContacts');
    await this.db.clear('offlineChanges');
    await this.updatePendingChangesCount();
  }
}

export const offlineService = new OfflineService();
