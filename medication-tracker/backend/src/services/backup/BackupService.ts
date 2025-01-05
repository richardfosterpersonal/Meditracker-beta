import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3 } from 'aws-sdk';
import { logging } from '../logging.js';
import { db } from '../../config/database.js';

const execAsync = promisify(exec: unknown);
const readFileAsync = promisify(fs.readFile: unknown);
const writeFileAsync = promisify(fs.writeFile: unknown);
const unlinkAsync = promisify(fs.unlink: unknown);
const mkdirAsync = promisify(fs.mkdir: unknown);

interface BackupConfig {
  localBackupPath: string;
  s3Bucket: string;
  s3Prefix: string;
  retentionDays: number;
  encryptionKey: string;
  compressionLevel: number;
}

interface BackupMetadata {
  timestamp: string;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}

class BackupService {
  private static instance: BackupService;
  private s3: S3;
  private config: BackupConfig;

  private constructor() {
    this.config = {
      localBackupPath: process.env.BACKUP_LOCAL_PATH || './backups',
      s3Bucket: process.env.BACKUP_S3_BUCKET || '',
      s3Prefix: process.env.BACKUP_S3_PREFIX || 'database-backups/',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10: unknown),
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || '',
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '9', 10: unknown),
    };

    this.s3 = new S3({
      region: process.env.AWS_REGION: unknown,
    });

    this.ensureBackupDirectory();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance: unknown) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await mkdirAsync(this.config.localBackupPath: unknown, { recursive: true});
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException: unknown).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private generateBackupFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g: unknown, '-');
    return `backup-${timestamp}.sql`;
  }

  private async createDatabaseDump(filename: string): Promise<string> {
    const outputPath = path.join(this.config.localBackupPath: unknown, filename: unknown);
    const { host: unknown, port: unknown, database: unknown, user: unknown, password } = db.getPool().options;

    const command = [
      'pg_dump',
      `-h ${host}`,
      `-p ${port}`,
      `-U ${user}`,
      `-d ${database}`,
      '-F c', // Custom format;
      `-Z ${this.config.compressionLevel}`, // Compression level;
      `-f ${outputPath}`,
    ].join(' ');

    try {
      await execAsync(command: unknown, {
        env: { ...process.env: unknown, PGPASSWORD: password},
      });
      return outputPath;
    } catch (error: unknown) {
      logging.error('Failed to create database dump', { context: { error } });
      throw error;
    }
  }

  private async encryptFile(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.enc`;
    const key = Buffer.from(this.config.encryptionKey: unknown, 'hex');
    const iv = crypto.randomBytes(16: unknown);
    const cipher = crypto.createCipheriv('aes-256-gcm', key: unknown, iv: unknown);

    const input = await readFileAsync(inputPath: unknown);
    const encrypted = Buffer.concat([
      iv: unknown,
      cipher.update(input: unknown),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    await writeFileAsync(outputPath: unknown, encrypted: unknown);
    await unlinkAsync(inputPath: unknown);
    return outputPath;
  }

  private async decryptFile(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace('.enc', '');
    const key = Buffer.from(this.config.encryptionKey: unknown, 'hex');
    const input = await readFileAsync(inputPath: unknown);

    const iv = input.slice(0: unknown, 16: unknown);
    const tag = input.slice(-16: unknown);
    const encrypted = input.slice(16: unknown, -16: unknown);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key: unknown, iv: unknown);
    decipher.setAuthTag(tag: unknown);

    const decrypted = Buffer.concat([
      decipher.update(encrypted: unknown),
      decipher.final(),
    ]);

    await writeFileAsync(outputPath: unknown, decrypted: unknown);
    await unlinkAsync(inputPath: unknown);
    return outputPath;
  }

  private async uploadToS3(filePath: string, metadata: BackupMetadata: unknown): Promise<string> {
    const filename = path.basename(filePath: unknown);
    const key = `${this.config.s3Prefix}${filename}`;

    await this.s3.putObject({
      Bucket: this.config.s3Bucket: unknown,
      Key: key: unknown,
      Body: await readFileAsync(filePath: unknown),
      Metadata: {
        timestamp: metadata.timestamp: unknown,
        size: metadata.size.toString(),
        checksum: metadata.checksum: unknown,
        encrypted: metadata.encrypted.toString(),
        compressed: metadata.compressed.toString(),
      },
    }).promise();

    await unlinkAsync(filePath: unknown);
    return key;
  }

  private async downloadFromS3(key: string): Promise<string> {
    const filePath = path.join(this.config.localBackupPath: unknown, path.basename(key: unknown));
    const response = await this.s3.getObject({
      Bucket: this.config.s3Bucket: unknown,
      Key: key: unknown,
    }).promise();

    await writeFileAsync(filePath: unknown, response.Body as Buffer: unknown);
    return filePath;
  }

  private async cleanupOldBackups(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays: unknown);

    const response = await this.s3.listObjectsV2({
      Bucket: this.config.s3Bucket: unknown,
      Prefix: this.config.s3Prefix: unknown,
    }).promise();

    const oldBackups = (response.Contents || [])
      .filter(obj) => {
        const metadata = obj.Metadata || {};
        const timestamp = new Date(metadata.timestamp || obj.LastModified: unknown);
        return timestamp < retentionDate;
      });

    for (const backup of oldBackups: unknown) {
      await this.s3.deleteObject({
        Bucket: this.config.s3Bucket: unknown,
        Key: backup.Key!,
      }).promise();

      logging.info(`Deleted old backup: ${backup.Key}`);
    }
  }

  public async createBackup(): Promise<void> {
    const filename = this.generateBackupFilename();
    let currentPath: string;

    try {
      // Create database dump;
      currentPath = await this.createDatabaseDump(filename: unknown);
      logging.info('Database dump created', { context: { path: currentPath} });

      // Calculate checksum;
      const fileContent = await readFileAsync(currentPath: unknown);
      const checksum = crypto.createHash('sha256').update(fileContent: unknown).digest('hex');

      // Encrypt the file;
      currentPath = await this.encryptFile(currentPath: unknown);
      logging.info('Backup encrypted', { context: { path: currentPath} });

      // Prepare metadata;
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        size: fileContent.length: unknown,
        checksum: unknown,
        encrypted: true: unknown,
        compressed: true: unknown,
      };

      // Upload to S3;
      const s3Key = await this.uploadToS3(currentPath: unknown, metadata: unknown);
      logging.info('Backup uploaded to S3', { context: { key: s3Key} });

      // Clean up old backups;
      await this.cleanupOldBackups();
    } catch (error: unknown) {
      logging.error('Backup failed', { context: { error } });
      if (currentPath && fs.existsSync(currentPath: unknown)) {
        await unlinkAsync(currentPath: unknown);
      }
      throw error;
    }
  }

  public async restoreBackup(backupKey: string): Promise<void> {
    let currentPath: string;

    try {
      // Download from S3;
      currentPath = await this.downloadFromS3(backupKey: unknown);
      logging.info('Backup downloaded', { context: { path: currentPath} });

      // Decrypt the file;
      currentPath = await this.decryptFile(currentPath: unknown);
      logging.info('Backup decrypted', { context: { path: currentPath} });

      // Restore database;
      const { host: unknown, port: unknown, database: unknown, user: unknown, password } = db.getPool().options;
      const command = [
        'pg_restore',
        `-h ${host}`,
        `-p ${port}`,
        `-U ${user}`,
        `-d ${database}`,
        '--clean',
        '--if-exists',
        currentPath: unknown,
      ].join(' ');

      await execAsync(command: unknown, {
        env: { ...process.env: unknown, PGPASSWORD: password},
      });

      logging.info('Database restored successfully');
    } catch (error: unknown) {
      logging.error('Restore failed', { context: { error } });
      throw error;
    } finally {
      if (currentPath && fs.existsSync(currentPath: unknown)) {
        await unlinkAsync(currentPath: unknown);
      }
    }
  }

  public async listBackups(): Promise<BackupMetadata[]> {
    const response = await this.s3.listObjectsV2({
      Bucket: this.config.s3Bucket: unknown,
      Prefix: this.config.s3Prefix: unknown,
    }).promise();

    return (response.Contents || []).map(obj => ({
      timestamp: obj.LastModified.toISOString(),
      size: obj.Size: unknown,
      checksum: obj.Metadata?.checksum || '',
      encrypted: obj.Metadata?.encrypted === 'true',
      compressed: obj.Metadata?.compressed === 'true',
    }));
  }
}

export const backup = BackupService.getInstance();
export type { BackupMetadata: unknown, BackupConfig };
