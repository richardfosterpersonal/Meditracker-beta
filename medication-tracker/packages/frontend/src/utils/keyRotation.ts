import { openDB } from 'idb';
import { Buffer } from 'buffer';

interface KeyData {
  key: string;
  version: number;
  createdAt: string;
  expiresAt: string;
}

export class KeyRotationService {
  private static readonly KEY_VALIDITY_DAYS = 30;
  private static readonly DB_NAME = 'encryption-keys';
  private static readonly STORE_NAME = 'keys';

  private static async getDB() {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(this.STORE_NAME, { keyPath: 'version' });
      },
    });
  }

  static async generateNewKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    return Buffer.from(exportedKey).toString('base64');
  }

  static async rotateKey(): Promise<KeyData> {
    const db = await this.getDB();
    const currentVersion = await this.getCurrentKeyVersion();
    const newVersion = currentVersion + 1;

    const newKey: KeyData = {
      key: await this.generateNewKey(),
      version: newVersion,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.KEY_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };

    await db.put(this.STORE_NAME, newKey);
    return newKey;
  }

  static async getCurrentKey(): Promise<KeyData> {
    const db = await this.getDB();
    const version = await this.getCurrentKeyVersion();
    const key = await db.get(this.STORE_NAME, version);

    if (!key) {
      // If no key exists, create the first one
      return this.rotateKey();
    }

    // Check if key needs rotation
    if (new Date(key.expiresAt) <= new Date()) {
      return this.rotateKey();
    }

    return key;
  }

  static async getCurrentKeyVersion(): Promise<number> {
    const db = await this.getDB();
    const keys = await db.getAll(this.STORE_NAME);
    return keys.reduce((max, key) => Math.max(max, key.version), 0);
  }

  static async getAllKeys(): Promise<KeyData[]> {
    const db = await this.getDB();
    return db.getAll(this.STORE_NAME);
  }

  static async cleanupOldKeys(): Promise<void> {
    const db = await this.getDB();
    const keys = await this.getAllKeys();
    const currentVersion = await this.getCurrentKeyVersion();

    // Keep the current key and one previous version for decrypting old data
    const keysToDelete = keys.filter(
      key => key.version < currentVersion - 1
    );

    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    await Promise.all(
      keysToDelete.map(key => tx.store.delete(key.version))
    );
    await tx.done;
  }
}
