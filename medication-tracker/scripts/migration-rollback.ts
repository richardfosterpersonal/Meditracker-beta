import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function rollbackMigration(backupPath: string) {
  logger.info('Starting migration rollback...');

  try {
    // 1. Verify Backup File
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    logger.info('Backup file verified');

    // 2. Check Backup File Integrity
    const backupStats = fs.statSync(backupPath);
    if (backupStats.size === 0) {
      throw new Error('Backup file is empty');
    }
    logger.info('Backup file integrity verified');

    // 3. Record Rollback Intent
    await prisma.auditLog.create({
      data: {
        action: 'MIGRATION_ROLLBACK_STARTED',
        resource: 'database',
        details: {
          backupFile: path.basename(backupPath),
          timestamp: new Date().toISOString(),
        },
      }
    });

    // 4. Disconnect All Active Connections
    await prisma.$executeRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()`;
    logger.info('Active connections terminated');

    // 5. Drop Current Schema
    await prisma.$executeRaw`DROP SCHEMA public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;
    logger.info('Current schema dropped');

    // 6. Restore From Backup
    // Note: This requires pg_restore to be available
    const { execSync } = require('child_process');
    execSync(`pg_restore -d ${process.env.DATABASE_URL} ${backupPath}`);
    logger.info('Database restored from backup');

    // 7. Verify Restoration
    const tables = [
      'User',
      'Medication',
      'ScheduledDose',
      'DoseLog',
      'NotificationRule',
      'EmergencyAccessLog',
      'AuditLog',
    ];

    for (const table of tables) {
      const count = await prisma[table.toLowerCase()].count();
      logger.info(`Table ${table} restored with ${count} records`);
    }

    // 8. Record Rollback Completion
    await prisma.auditLog.create({
      data: {
        action: 'MIGRATION_ROLLBACK_COMPLETED',
        resource: 'database',
        details: {
          backupFile: path.basename(backupPath),
          timestamp: new Date().toISOString(),
        },
      }
    });

    logger.info('Migration rollback completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration rollback failed:', error);
    
    // Record Rollback Failure
    await prisma.auditLog.create({
      data: {
        action: 'MIGRATION_ROLLBACK_FAILED',
        resource: 'database',
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      }
    });

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check if backup path is provided
const backupPath = process.argv[2];
if (!backupPath) {
  logger.error('Backup path must be provided');
  process.exit(1);
}

rollbackMigration(backupPath)
  .catch((error) => {
    logger.error('Rollback script failed:', error);
    process.exit(1);
  });
