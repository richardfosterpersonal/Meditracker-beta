import { openDB } from 'idb';
import { EncryptionService } from './encryption';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId: string;
  details: {
    medicationId?: string;
    medicationName?: string;
    dosage?: string;
    scheduledTime?: string;
    actualTime?: string;
    success: boolean;
    error?: string;
    deviceInfo: {
      userAgent: string;
      platform: string;
      language: string;
      timezone: string;
    };
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export class AuditLogger {
  private static readonly DB_NAME = 'medication-tracker-audit';
  private static readonly STORE_NAME = 'audit-logs';
  private static readonly RETENTION_DAYS = 365; // Keep logs for 1 year

  private static async getDB() {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(this.STORE_NAME, {
          keyPath: 'timestamp',
        });
        store.createIndex('userId', 'userId');
        store.createIndex('action', 'action');
        store.createIndex('severity', 'severity');
      },
    });
  }

  static async log(
    action: string,
    userId: string,
    details: Omit<AuditLogEntry['details'], 'deviceInfo'>,
    severity: AuditLogEntry['severity'] = 'info'
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details: {
        ...details,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      severity,
    };

    try {
      // Encrypt sensitive information
      const encryptedEntry = await EncryptionService.encrypt(entry);
      const db = await this.getDB();
      await db.add(this.STORE_NAME, encryptedEntry);

      // If it's a critical event, ensure immediate sync to server
      if (severity === 'critical') {
        await this.syncToServer([encryptedEntry]);
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // For critical logs, if local storage fails, try direct server upload
      if (severity === 'critical') {
        await this.syncToServer([entry]);
      }
    }
  }

  static async getMedicationLogs(
    medicationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogEntry[]> {
    const db = await this.getDB();
    const logs = await db.getAllFromIndex(
      this.STORE_NAME,
      'action',
      'medication_taken'
    );

    const decryptedLogs = await Promise.all(
      logs.map(async (log) => await EncryptionService.decrypt(log))
    );

    return decryptedLogs
      .filter((log) => log.details.medicationId === medicationId)
      .filter((log) => {
        if (!startDate && !endDate) return true;
        const logDate = new Date(log.timestamp);
        return (
          (!startDate || logDate >= startDate) &&
          (!endDate || logDate <= endDate)
        );
      });
  }

  static async getErrorLogs(
    severity: AuditLogEntry['severity'][] = ['error', 'critical']
  ): Promise<AuditLogEntry[]> {
    const db = await this.getDB();
    const logs = await db.getAllFromIndex(this.STORE_NAME, 'severity');

    const decryptedLogs = await Promise.all(
      logs.map(async (log) => await EncryptionService.decrypt(log))
    );

    return decryptedLogs.filter((log) => severity.includes(log.severity));
  }

  private static async syncToServer(
    logs: any[]
  ): Promise<void> {
    try {
      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });

      if (!response.ok) {
        throw new Error('Failed to sync logs to server');
      }
    } catch (error) {
      console.error('Failed to sync audit logs:', error);
      // Store failed sync attempts for retry
      const db = await this.getDB();
      await db.put('failed-syncs', {
        timestamp: new Date().toISOString(),
        logs,
      });
    }
  }

  static async cleanupOldLogs(): Promise<void> {
    const db = await this.getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.store;

    let cursor = await store.openCursor();
    while (cursor) {
      const logDate = new Date(cursor.key as string);
      if (logDate < cutoffDate) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  // Utility method for generating compliance reports
  static async generateComplianceReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalMedications: number;
    adherenceRate: number;
    missedDoses: number;
    lateAdministrations: number;
    errors: number;
  }> {
    const db = await this.getDB();
    const logs = await db.getAllFromIndex(this.STORE_NAME, 'userId', userId);

    const decryptedLogs = await Promise.all(
      logs.map(async (log) => await EncryptionService.decrypt(log))
    );

    const relevantLogs = decryptedLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });

    const medicationLogs = relevantLogs.filter(
      (log) => log.action === 'medication_taken'
    );

    return {
      totalMedications: medicationLogs.length,
      adherenceRate: this.calculateAdherenceRate(medicationLogs),
      missedDoses: this.countMissedDoses(medicationLogs),
      lateAdministrations: this.countLateAdministrations(medicationLogs),
      errors: relevantLogs.filter((log) => log.severity === 'error').length,
    };
  }

  private static calculateAdherenceRate(logs: AuditLogEntry[]): number {
    const total = logs.length;
    const takenOnTime = logs.filter((log) => {
      const scheduled = new Date(log.details.scheduledTime!);
      const actual = new Date(log.details.actualTime!);
      const diffMinutes = Math.abs(actual.getTime() - scheduled.getTime()) / 60000;
      return diffMinutes <= 30; // Within 30 minutes of scheduled time
    }).length;

    return (takenOnTime / total) * 100;
  }

  private static countMissedDoses(logs: AuditLogEntry[]): number {
    return logs.filter((log) => !log.details.success).length;
  }

  private static countLateAdministrations(logs: AuditLogEntry[]): number {
    return logs.filter((log) => {
      const scheduled = new Date(log.details.scheduledTime!);
      const actual = new Date(log.details.actualTime!);
      const diffMinutes = Math.abs(actual.getTime() - scheduled.getTime()) / 60000;
      return diffMinutes > 30 && log.details.success;
    }).length;
  }
}
