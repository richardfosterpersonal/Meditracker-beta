import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MedicationTrackerDB extends DBSchema {
  medications: {
    key: string;
    value: {
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      timeOfDay: string;
      notes?: string;
      updatedAt: number;
    };
    indexes: { 'by-updated': number };
  };
  doses: {
    key: string;
    value: {
      id: string;
      medicationId: string;
      takenAt: number;
      status: 'pending' | 'synced' | 'failed';
    };
    indexes: { 'by-status': string };
  };
}

class OfflineStorage {
  private dbName = 'medication-tracker-offline';
  private version = 1;
  private db: IDBPDatabase<MedicationTrackerDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<MedicationTrackerDB>(this.dbName, this.version, {
      upgrade(db) {
        // Create medications store
        const medicationsStore = db.createObjectStore('medications', {
          keyPath: 'id',
        });
        medicationsStore.createIndex('by-updated', 'updatedAt');

        // Create doses store
        const dosesStore = db.createObjectStore('doses', {
          keyPath: 'id',
        });
        dosesStore.createIndex('by-status', 'status');
      },
    });
  }

  async saveMedication(medication: MedicationTrackerDB['medications']['value']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('medications', {
      ...medication,
      updatedAt: Date.now(),
    });
  }

  async getMedication(id: string): Promise<MedicationTrackerDB['medications']['value'] | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get('medications', id);
  }

  async getAllMedications(): Promise<MedicationTrackerDB['medications']['value'][]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('medications');
  }

  async saveDose(dose: MedicationTrackerDB['doses']['value']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('doses', dose);
  }

  async getPendingDoses(): Promise<MedicationTrackerDB['doses']['value'][]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('doses', 'by-status', 'pending');
  }

  async updateDoseStatus(id: string, status: 'synced' | 'failed'): Promise<void> {
    if (!this.db) await this.init();
    const dose = await this.db!.get('doses', id);
    if (dose) {
      dose.status = status;
      await this.db!.put('doses', dose);
    }
  }

  async clearSyncedData(): Promise<void> {
    if (!this.db) await this.init();
    const syncedDoses = await this.db!.getAllFromIndex('doses', 'by-status', 'synced');
    const tx = this.db!.transaction('doses', 'readwrite');
    await Promise.all(syncedDoses.map(dose => tx.store.delete(dose.id)));
    await tx.done;
  }
}

export const offlineStorage = new OfflineStorage();
export default offlineStorage;
