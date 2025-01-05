import { openDB, IDBPDatabase } from 'idb';
import { encryption } from './encryption';
import { AuditLogger } from './auditLog';
import { monitoring } from './monitoring';
import { performanceMonitoring } from './performanceMonitoring';

interface BackupMetadata {
  timestamp: string;
  userId: string;
  version: string;
  checksum: string;
  encryptionKeyId: string;
}

interface BackupConfig {
  retentionDays: number;
  maxBackups: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
}

class BackupService {
  private static instance: BackupService;
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'medication-backup';
  private readonly STORE_BACKUP = 'backups';
  private readonly STORE_METADATA = 'backup-metadata';

  private config: BackupConfig = {
    retentionDays: 30,
    maxBackups: 10,
    encryptionEnabled: true,
    compressionEnabled: true,
  };

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, 1, {
        upgrade(db) {
          // Store for backup data
          db.createObjectStore(this.STORE_BACKUP, { keyPath: ['userId', 'timestamp'] });
          
          // Store for backup metadata
          db.createObjectStore(this.STORE_METADATA, { keyPath: ['userId', 'timestamp'] });
        },
      });

      // Start automatic backup schedule
      this.scheduleAutomaticBackups();
    } catch (error) {
      monitoring.captureError(error as Error, {
        component: 'BackupService',
        action: 'initialize',
      });
      throw new Error('Failed to initialize backup service');
    }
  }

  private scheduleAutomaticBackups(): void {
    // Schedule daily backups at 3 AM
    const now = new Date();
    const nextBackup = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      3, 0, 0
    );
    
    const timeUntilNextBackup = nextBackup.getTime() - now.getTime();
    
    setTimeout(() => {
      this.performAutomaticBackup();
      // Schedule next backup
      setInterval(() => {
        this.performAutomaticBackup();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNextBackup);
  }

  private async performAutomaticBackup(): Promise<void> {
    try {
      // Get all users (in a real app, this would come from your user service)
      const users = await this.getAllUsers();
      
      for (const userId of users) {
        await this.createBackup(userId);
      }

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch (error) {
      monitoring.captureError(error as Error, {
        component: 'BackupService',
        action: 'automaticBackup',
      });
    }
  }

  async createBackup(userId: string): Promise<void> {
    if (!this.db) throw new Error('Backup service not initialized');

    const startTime = performance.now();
    
    try {
      // Get all user data
      const userData = await this.getAllUserData(userId);
      
      // Compress data
      const compressedData = this.config.compressionEnabled
        ? await this.compressData(userData)
        : userData;
      
      // Encrypt data
      let encryptedData = compressedData;
      let encryptionKeyId = '';
      
      if (this.config.encryptionEnabled) {
        const { data, keyId } = await encryption.encrypt(JSON.stringify(compressedData));
        encryptedData = data;
        encryptionKeyId = keyId;
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(encryptedData);

      // Create backup metadata
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        userId,
        version: '1.0',
        checksum,
        encryptionKeyId,
      };

      // Store backup and metadata
      const tx = this.db.transaction([this.STORE_BACKUP, this.STORE_METADATA], 'readwrite');
      await tx.objectStore(this.STORE_BACKUP).add({
        userId,
        timestamp: metadata.timestamp,
        data: encryptedData,
      });
      await tx.objectStore(this.STORE_METADATA).add(metadata);
      await tx.done;

      // Log success
      await AuditLogger.log(
        'backup_created',
        userId,
        {
          timestamp: metadata.timestamp,
          checksum,
          success: true,
        },
        'info'
      );

      // Record performance
      const duration = performance.now() - startTime;
      performanceMonitoring.recordMetric({
        name: 'backup_creation',
        value: duration,
        unit: 'ms',
        tags: { userId },
      });
    } catch (error) {
      monitoring.captureError(error as Error, {
        component: 'BackupService',
        action: 'createBackup',
        metadata: { userId },
      });
      
      await AuditLogger.log(
        'backup_failed',
        userId,
        {
          error: (error as Error).message,
          success: false,
        },
        'error'
      );
      
      throw error;
    }
  }

  async restoreBackup(userId: string, timestamp: string): Promise<void> {
    if (!this.db) throw new Error('Backup service not initialized');

    const startTime = performance.now();
    
    try {
      // Get backup and metadata
      const backup = await this.db.get(this.STORE_BACKUP, [userId, timestamp]);
      const metadata = await this.db.get(this.STORE_METADATA, [userId, timestamp]);

      if (!backup || !metadata) {
        throw new Error('Backup not found');
      }

      // Verify checksum
      const checksum = await this.calculateChecksum(backup.data);
      if (checksum !== metadata.checksum) {
        throw new Error('Backup integrity check failed');
      }

      // Decrypt data
      let decryptedData = backup.data;
      if (this.config.encryptionEnabled && metadata.encryptionKeyId) {
        decryptedData = await encryption.decrypt(backup.data, metadata.encryptionKeyId);
      }

      // Decompress if needed
      const finalData = this.config.compressionEnabled
        ? await this.decompressData(decryptedData)
        : decryptedData;

      // Restore data
      await this.restoreUserData(userId, finalData);

      // Log success
      await AuditLogger.log(
        'backup_restored',
        userId,
        {
          timestamp,
          checksum,
          success: true,
        },
        'info'
      );

      // Record performance
      const duration = performance.now() - startTime;
      performanceMonitoring.recordMetric({
        name: 'backup_restore',
        value: duration,
        unit: 'ms',
        tags: { userId },
      });
    } catch (error) {
      monitoring.captureError(error as Error, {
        component: 'BackupService',
        action: 'restoreBackup',
        metadata: { userId, timestamp },
      });
      
      await AuditLogger.log(
        'backup_restore_failed',
        userId,
        {
          timestamp,
          error: (error as Error).message,
          success: false,
        },
        'error'
      );
      
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.db) throw new Error('Backup service not initialized');

    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);

      const tx = this.db.transaction([this.STORE_BACKUP, this.STORE_METADATA], 'readwrite');
      const backupStore = tx.objectStore(this.STORE_BACKUP);
      const metadataStore = tx.objectStore(this.STORE_METADATA);

      // Get all backups
      const backups = await backupStore.getAll();
      const oldBackups = backups.filter(
        backup => new Date(backup.timestamp) < retentionDate
      );

      // Delete old backups
      for (const backup of oldBackups) {
        await backupStore.delete([backup.userId, backup.timestamp]);
        await metadataStore.delete([backup.userId, backup.timestamp]);
      }

      await tx.done;

      // Log cleanup
      await AuditLogger.log(
        'backup_cleanup',
        'system',
        {
          deletedCount: oldBackups.length,
          retentionDays: this.config.retentionDays,
          success: true,
        },
        'info'
      );
    } catch (error) {
      monitoring.captureError(error as Error, {
        component: 'BackupService',
        action: 'cleanupOldBackups',
      });
    }
  }

  private async calculateChecksum(data: any): Promise<string> {
    const msgBuffer = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async compressData(data: any): Promise<any> {
    // In a real app, implement compression using a library like pako
    return data;
  }

  private async decompressData(data: any): Promise<any> {
    // In a real app, implement decompression using a library like pako
    return data;
  }

  private async getAllUsers(): Promise<string[]> {
    // In a real app, get this from your user service
    return ['user1', 'user2'];
  }

  private async getAllUserData(userId: string): Promise<any> {
    // In a real app, gather all user data from various stores
    return {};
  }

  private async restoreUserData(userId: string, data: any): Promise<void> {
    // In a real app, restore data to various stores
  }

  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const backupService = BackupService.getInstance();
