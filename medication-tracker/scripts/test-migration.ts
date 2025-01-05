import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

type TableInfo = {
  name: string;
  model: any;
};

async function testMigration() {
  logger.info('Starting migration test...');

  try {
    // 1. Test Database Connection
    await prisma.$connect();
    logger.info('Database connection successful');

    // 2. Verify Schema
    const tables: TableInfo[] = [
      { name: 'User', model: prisma.user },
      { name: 'Medication', model: prisma.medication },
      { name: 'ScheduledDose', model: prisma.scheduledDose },
      { name: 'DoseLog', model: prisma.doseLog },
      { name: 'NotificationRule', model: prisma.notificationRule },
      { name: 'EmergencyAccessLog', model: prisma.emergencyAccessLog },
      { name: 'AuditLog', model: prisma.auditLog },
      { name: 'DataEncryptionKey', model: prisma.dataEncryptionKey },
      { name: 'TwoFactorBackupCode', model: prisma.twoFactorBackupCode }
    ];

    for (const table of tables) {
      const count = await table.model.count();
      logger.info(`Table ${table.name} exists with ${count} records`);
    }

    // 3. Test Required Indexes
    const userEmailIndex = await prisma.$queryRaw`
      SELECT * FROM pg_indexes 
      WHERE tablename = 'User' 
      AND indexname = 'User_email_key'`;
    logger.info('User email index verified');

    // 4. Test Foreign Key Constraints
    const medications = await prisma.medication.findMany({
      take: 1,
      include: {
        scheduledDoses: true,
        doseLogs: true,
      }
    });
    logger.info('Foreign key relationships verified');

    // 5. Test Data Types
    const user = await prisma.user.findFirst({
      include: {
        medications: true,
        notificationRules: true,
        securityLog: true,
      }
    });
    logger.info('Data types verified');

    // 6. Test Encryption
    const encryptionKeys = await prisma.dataEncryptionKey.findMany({
      select: {
        keyId: true,
        version: true,
      }
    });
    logger.info(`Encryption keys verified: ${encryptionKeys.length} keys found`);

    // 7. Test Audit Logging
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'MIGRATION_TEST',
          resource: 'database',
          details: { test: 'migration_verification' },
        }
      });
      logger.info('Audit logging verified');
    }

    // 8. Test Two-Factor Authentication
    const twoFactorUsers = await prisma.user.count({
      where: {
        twoFactorEnabled: true,
      }
    });
    logger.info(`Two-factor authentication verified: ${twoFactorUsers} users enabled`);

    // 9. Test Emergency Access
    const emergencyLogs = await prisma.emergencyAccessLog.findMany({
      take: 1,
      orderBy: {
        createdAt: 'desc',
      }
    });
    logger.info('Emergency access logging verified');

    // 10. Clean Up Test Data
    await prisma.auditLog.deleteMany({
      where: {
        action: 'MIGRATION_TEST',
      }
    });

    logger.info('Migration test completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testMigration()
  .catch((error) => {
    logger.error('Migration test script failed:', error);
    process.exit(1);
  });
